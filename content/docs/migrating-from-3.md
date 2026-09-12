---
title: "Migrating from Statusengine 3"
description: "Retiring the PHP worker: what version 4 dropped, removing the old service and cronjob, the schema changes, and converting the database to a current collation."
date: 2026-09-08
weight: 40
---

Statusengine 4 replaces the PHP worker with a single Go binary. The queues are
the same, the tables are almost the same, and the data you already have stays
where it is — so this is an in-place upgrade rather than a reinstall. What
changes is everything that used to sit *beside* MySQL.

Read the next section before you touch anything: if your setup depends on one
of the backends that version 4 removed, you have to start over or build your own migration.

## What Statusengine 4 dropped

{{< callout type="warning" >}}
**MySQL and Graphite are the only backends left.** CrateDB and Elasticsearch
are gone, the Redis/Valkey dependency is gone, and with it the In-memory
feature. There is no migration path for data that lives in CrateDB or
Elasticsearch — version 4 cannot read it, and cannot import it.
{{< /callout >}}

| Removed | What to do about it |
|---|---|
| **CrateDB backend** | MySQL is the only supported database. If CrateDB is your live backend, plan that move first — the tables are not compatible and nothing converts them. |
| **Elasticsearch backend** | Same: version 4 never writes to Elasticsearch. An existing index keeps whatever it already holds. |
| **Redis / Valkey** | No longer a dependency at all. |
| **The [In-memory feature](/v3/worker/#in-memory)** | The live-state objects in Redis (`hosts_up`, `services_ok`, `hoststatus_<hostname>` and the rest) are not written by version 4. Anything that read them needs another source. |

For the last one there is a direct replacement: the worker's
[WebSocket event stream](/docs/api/) carries every event as it happens, which
is what the Redis objects were usually being polled for. `statusengine_hoststatus`
and `statusengine_servicestatus` still hold the current state of every host and
service in MySQL.

Performance data goes to MySQL, to Graphite over the Carbon plaintext protocol,
or to both. No other target exists.

## 1. Stop Statusengine 3

The old worker and the new one consume the same queues. Running both at once
means each of them gets an arbitrary half of your monitoring data, so stop the
old one first and leave it stopped.

```bash
systemctl stop statusengine.service
systemctl disable statusengine.service
```

Version 3 installed its unit by hand into `/lib/systemd/system/`, which is
where distribution packages live. Nothing else will ever clean it up:

```bash
rm /lib/systemd/system/statusengine.service
systemctl daemon-reload
```

The database cleanup ran from a cronjob. Version 4 replaces it with the
`statusengine-db-cleanup.timer` unit, so the old entry has to go — otherwise
`Console.php` keeps firing every night against a tree that no longer has a
running worker behind it:

```bash
rm /etc/cron.d/statusengine
```

{{< callout type="info" >}}
Leave `/opt/statusengine/worker` itself in place for now. Its
`etc/config.yml` is the reference you will translate the new configuration
from, and you may want to look something up before deleting it.
{{< /callout >}}

## 2. Back up the database

Every step below rewrites tables. This is the one thing you cannot skip.

```bash
mysqldump --single-transaction --routines --triggers \
  statusengine | gzip > statusengine-before-4.sql.gz
```

`--single-transaction` keeps the dump consistent without locking the tables.
On a system that has been collecting history for years the result can be tens
of gigabytes; check that there is room before you start. On MariaDB 11 the
command is `mariadb-dump` — that release dropped the `mysql*` names.

## 3. Bring the schema up to date

Version 4 expects the 3.7 schema plus the changes below. If your database is
older than 3.7, apply
[`lib/mysql_update.sql`](https://github.com/statusengine/worker/blob/master/lib/mysql_update.sql)
from the old worker first — it adds the `*_usec` columns and the primary keys
that everything here assumes.

### Acknowledgements gain an end time

Naemon acknowledgements can expire. The broker module publishes that expiry as
`end_time` on the acknowledgement message — `0` means "does not expire", which
is also what every acknowledgement reports under Nagios, since Nagios has no
expiring acknowledgements at all.

```sql
ALTER TABLE `statusengine_host_acknowledgements`    ADD COLUMN `end_time` BIGINT NOT NULL DEFAULT 0;
ALTER TABLE `statusengine_service_acknowledgements` ADD COLUMN `end_time` BIGINT NOT NULL DEFAULT 0;
```

These are the two smallest tables in the schema; the change takes seconds.

## 4. Convert the database to a current collation

Version 3 created its tables as `utf8` with `utf8_general_ci`. That "utf8" is
MySQL's three-byte version, which cannot store anything outside the Basic
Multilingual Plane — an emoji in a plugin output does not round-trip through
it. `utf8mb4` is real UTF-8 and has been the sensible default for a decade.

Current servers report the old name as `utf8mb3_general_ci`, so that is what you
will see if you go looking:

```sql
SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'statusengine';
```

The collation is the fiddly half. MySQL and MariaDB spent years without a
collation in common, and the advice you will find online is mostly from that
period. Measured on the three servers that matter today:

| Server | `utf8mb4_0900_ai_ci` | `utf8mb4_unicode_520_ci` |
|---|---|---|
| MySQL 8.0 | yes | yes |
| MariaDB 11.4 | yes — added as a compatible alias in 11.4.5 | yes |
| MariaDB 10.11 | no | yes |

So there is a single order of preference rather than one rule per vendor. The
script below takes the first collation the server actually knows:

1. `utf8mb4_0900_ai_ci` — Unicode 9, and what the worker's own schema uses. Both
   MySQL 8 and a current MariaDB land here.
2. `utf8mb4_uca1400_ai_ci` — Unicode 14, MariaDB 11.5 and later.
3. `utf8mb4_unicode_520_ci` — Unicode 5.2, on every MariaDB still in support.
4. `utf8mb4_general_ci` — no Unicode collation at all, but it exists everywhere.

Which rung you land on matters far less than landing on **one**: a database
with two collations in it turns ordinary joins into `Illegal mix of collations`
errors.

Credentials come from a MySQL option file rather than the command line, because
anything on a command line is readable by every user on the machine through
`/proc`. Create `~/.my.cnf` with mode `0600`:

```ini
[client]
user = statusengine
password = "your-password"
host = localhost
```

```bash
#!/usr/bin/env bash
# Convert the Statusengine tables to utf8mb4 and a current collation.
#
#   DB=statusengine ./statusengine-collation.sh
#
set -euo pipefail

DB="${DB:-statusengine}"

# MariaDB 11 ships only `mariadb`; the `mysql` name was dropped there.
client=$(command -v mysql || command -v mariadb || true)
[ -n "$client" ] || { echo "no mysql or mariadb client found" >&2; exit 1; }
sql=("$client" --defaults-extra-file="${MYSQL_CNF:-$HOME/.my.cnf}")

# Best first; the loop takes whichever this server has heard of, so an older
# MariaDB quietly lands on an older Unicode version instead of failing.
collation=""
for candidate in utf8mb4_0900_ai_ci utf8mb4_uca1400_ai_ci utf8mb4_unicode_520_ci utf8mb4_general_ci; do
    known=$("${sql[@]}" -Nse         "SELECT COUNT(*) FROM information_schema.COLLATIONS WHERE COLLATION_NAME='$candidate'")
    if [ "$known" -gt 0 ]; then
        collation="$candidate"
        break
    fi
done
[ -n "$collation" ] || { echo "no usable utf8mb4 collation on this server" >&2; exit 1; }

echo "Converting $DB to utf8mb4 / $collation"
echo "This rewrites every table and will take a while."

# Only the tables that are not already there, so a re-run after an interruption
# picks up where it stopped.
"${sql[@]}" -Nse "
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '$DB'
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME LIKE 'statusengine\\_%'
      AND TABLE_COLLATION <> '$collation'" |
while read -r table; do
    echo "  $table"
    "${sql[@]}" -e "ALTER TABLE \`$DB\`.\`$table\` CONVERT TO CHARACTER SET utf8mb4 COLLATE $collation"
done

# So that every table created from here on inherits it.
"${sql[@]}" -e "ALTER DATABASE \`$DB\` CHARACTER SET utf8mb4 COLLATE $collation"

echo "Done."
```

Run the migration script with the worker stopped!

Each `ALTER TABLE ... CONVERT` rewrites the whole table.
**This can take several hours**.
The table filter is `statusengine\_%`, so a
database shared with another application is left alone.

{{< details title="If an ALTER fails with \"index column size too large\"" closed="true" >}}
Converting to `utf8mb4` makes every character column a third wider in bytes, and
an index has a maximum key length. On tables still carrying InnoDB's old
`COMPACT` row format that limit is 767 bytes, which a `varchar(255)` alone
exceeds once it is `utf8mb4`.

`DYNAMIC` has been the default since MySQL 5.7 and MariaDB 10.2 and raises the
limit to 3072 bytes, which every index in this schema fits inside. Tables
created under an older server keep the format they were made with, so convert
them first:

```sql
ALTER TABLE `statusengine_service_downtimehistory` ROW_FORMAT=DYNAMIC;
```

To find them all:

```sql
SELECT TABLE_NAME, ROW_FORMAT FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'statusengine' AND ROW_FORMAT <> 'Dynamic';
```
{{< /details >}}

## 5. Install the Statusengine 4 worker

From here the normal installation applies — see
[Build and install](/docs/worker/#build-and-install), and
[A full install](/docs/worker/#a-full-install) for the whole sequence including
the systemd units.

Two things differ from what you are used to:

- The configuration moved. Version 3 read
  `/opt/statusengine/worker/etc/config.yml`; version 4 reads
  `/etc/statusengine/config.yml`, and the keys are not the same — do not copy
  the old file over. Work through [Configuration](/docs/worker/#configuration)
  with the old file open beside it.
- The cleanup is a systemd timer, not cron. `systemctl enable --now
  statusengine-db-cleanup.timer` is what replaces the entry you deleted in step 1.

## 6. Replace the broker module

Optional, and it can wait. The 4.x worker consumes exactly the queues the 3.x
broker module publishes, so an existing module keeps working and your monitoring
keeps flowing while you get the worker settled.

Swap it when convenient — see [Broker module](/docs/broker/). The current module
publishes the acknowledgement `end_time` from step 3, which the older one does
not send at all.

## 7. Clean up

Once the new worker has been running long enough that you trust it — a few days
of history in the tables, notifications arriving — the old tree can go:

```bash
rm -rf /opt/statusengine/worker
```

If nothing else on the machine uses them, the Redis server and the PHP
extensions Statusengine 3 pulled in can go too. Check first: on a monitoring
host, `php-redis` in particular is often there for something else.
