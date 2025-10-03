.PHONY: install
install:
	npm install

.PHONY: install-docs
install-docs:
	pip install -r requirements.txt

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
	uv sync --all-extras --all-packages --group dev

.PHONY: build-docs
build-docs:
	uv run mkdocs build

.PHONY: serve-docs
serve-docs:
	uv run mkdocs serve

.PHONY: deploy-docs
deploy-docs:
	uv run mkdocs gh-deploy --force --verbose
