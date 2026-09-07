# Statusengine documentation site.
#
# Everything runs inside the pinned Hugo *extended* container defined in
# docker-compose.yml. There is deliberately no target that calls a local hugo.

COMPOSE      := docker compose
THEME_TAG    ?= v0.9.7
THEME_REPO   := https://github.com/imfing/hextra.git

# Keep files written by the container owned by the invoking user.
export DOCKER_UID := $(shell id -u)
export DOCKER_GID := $(shell id -g)

.PHONY: help dev build clean shell check shots test-ui test-api upgrade-theme upgrade-scalar

help: ## Show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk -F':.*?## ' '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

dev: ## Live-reloading server on http://localhost:1313
	$(COMPOSE) up dev

build: ## Production build into public/
	$(COMPOSE) run --rm build

clean: ## Remove generated output
	rm -rf public resources .hugo_build.lock

shell: ## Shell inside the Hugo container
	$(COMPOSE) run --rm shell

check: build ## Build, then verify no external hosts and working highlighting
	@./scripts/check-build.sh

# Docker Desktop under WSL leaves a docker-container buildx builder selected
# that fails to boot ("invalid mount config"); the built-in docker driver
# builds fine. Set per invocation rather than changing the global selection.
shots: build ## Build, then screenshot the site (light and dark) into .shots/
	BUILDX_BUILDER=default $(COMPOSE) build shots
	$(COMPOSE) run --rm shots

test-ui: build ## Build, then drive the browser over behaviour the build cannot see
	BUILDX_BUILDER=default $(COMPOSE) build shots
	$(COMPOSE) run --rm shots node test-lightbox.js

# The API reference's privacy properties are configuration inside a 3.6 MB
# vendored bundle, so only a running browser can prove them. Everything the
# page requests has to come from our own origin.
test-api: build ## Build, then verify the API reference renders and contacts nobody
	BUILDX_BUILDER=default $(COMPOSE) build shots
	$(COMPOSE) run --rm shots node test-api.js

# Passed through explicitly rather than relying on make's export rules; empty
# falls back to the version pinned in the script.
upgrade-scalar: ## Re-vendor Scalar, e.g. make upgrade-scalar SCALAR_VERSION=1.69.0
	SCALAR_VERSION=$(SCALAR_VERSION) ./scripts/fetch-scalar.sh
	@echo
	@echo "Scalar re-vendored. Run 'make check' and 'make test-api'."

upgrade-theme: ## Re-vendor Hextra, e.g. make upgrade-theme THEME_TAG=v0.9.8
	rm -rf themes/hextra
	git clone --depth 1 --branch $(THEME_TAG) $(THEME_REPO) themes/hextra
	rm -rf themes/hextra/.git themes/hextra/.github themes/hextra/exampleSite \
	       themes/hextra/images themes/hextra/netlify.toml themes/hextra/build.sh \
	       themes/hextra/dev.toml themes/hextra/taskfile.yaml
	@echo
	@echo "Hextra re-vendored at $(THEME_TAG). Update themes/hextra/UPSTREAM.md, then run 'make check'."
