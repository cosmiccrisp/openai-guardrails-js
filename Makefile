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

.PHONY: build-docs
build-docs:
	mkdocs build

.PHONY: serve-docs
serve-docs:
	mkdocs serve
