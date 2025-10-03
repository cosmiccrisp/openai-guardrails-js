.PHONY: install
install:
	npm install

.PHONY: format
format: 
	npm run format

.PHONY: lint
lint: 
	npm run lint

.PHONY: test
test: 
	npm test

.PHONY: build
build:
	npm run build

.PHONY: sync
sync:
	uv sync

.PHONY: build-docs
build-docs:
	uv run mkdocs build --site-dir site

.PHONY: serve-docs
serve-docs:
	uv run mkdocs serve

.PHONY: deploy-docs
deploy-docs:
	uv run mkdocs gh-deploy --force --verbose
