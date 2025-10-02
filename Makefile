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

.PHONY: build-docs
build-docs:
	npm run docs:build

.PHONY: serve-docs
serve-docs:
	npm run docs:serve
