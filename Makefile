
MAKE_IN_CONTAINER := docker run --rm -v $(CURDIR):/var/app -w /var/app -e AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) -e AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) -e AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) -e AWS_SESSION_TOKEN=$(AWS_SESSION_TOKEN) adv-notifications-container make
BUNDLE             = adv-notifications
BUILD_VERSION 	   := $(shell cat $(BUNDLE).zip | md5sum | grep -Eo "^.{32}")
EB_APPLICATION_NAME = adv-notifications-hack-AdCentreNotifications-189ZIFLLM5F6H
EB_ENVIRONMENT_NAME = adv-AdCe-YA5X0G874HOJ

start: build
	@docker-compose up

build: .install
	@docker build -t adv-notifications .

package: build-container
	@$(MAKE_IN_CONTAINER) .package

deploy: build-container
	@$(MAKE_IN_CONTAINER) .deploy

update-stack: build-container
	@$(MAKE_IN_CONTAINER) .update-stack

build-container:
	@docker build -t adv-notifications-container -f Dockerfile.build .

.install:
	yarn

.package: .install
	zip -rq $(BUNDLE).zip node_modules package.json server.js .ebextensions

.deploy: .package
	@echo "deploying version $(BUILD_VERSION)"
	@aws s3 cp $(BUNDLE).zip --region ap-southeast-2 s3://adv-notifications-dev/$(BUNDLE)-$(BUILD_VERSION).zip
	@aws elasticbeanstalk create-application-version --application-name $(EB_APPLICATION_NAME) --region ap-southeast-2 --version-label $(BUILD_VERSION) --source-bundle S3Bucket="adv-notifications-dev",S3Key="$(BUNDLE)-$(BUILD_VERSION).zip"
	@aws elasticbeanstalk update-environment --application-name $(EB_APPLICATION_NAME) --region ap-southeast-2 --environment-name $(EB_ENVIRONMENT_NAME) --version-label $(BUILD_VERSION)

.update-stack:
	@aws cloudformation update-stack --stack-name adv-notifications-hack --template-body file:///$(CURDIR)/adv-notifications.yml --region ap-southeast-2 --parameters ParameterKey=KeyName,ParameterValue=Advertiser-Dev-Shared