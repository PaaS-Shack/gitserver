# Overview of Services

These are a set of services for managing email messages. They include functionality for receiving, parsing, signing, and sending email messages. The services are designed to be used together, but they can also be used independently. The services are designed to be used with the [MolecularJS]

## Installation

```bash
git clone https://github.com/paas-shack/email.git
cd email
npm i
npm run dev
```

## Kubernetes Install

YAML files are included to deploy the services to a Kubernetes cluster. The following command will deploy the services to a Kubernetes cluster:

```bash
kubectl apply -f yaml
```


## Requirements

The `emails` service requires the following:

- An S3 bucket for storing email messages.
- A MongoDB database for storing email-related data.
- A DKIM key pair for signing email messages.
- A valid domain name for sending email messages.   
- A valid MX record for the domain name.
- A valid SPF record for the domain name.
- A valid DMARC record for the domain name. TODO: Add DMARC support.


# Services

The following services are included:

- `emails.outbound`: Handles outbound email communication.
- `emails.inbound`: Handles inbound email communication.
- `emails.messages`: Manages email messages.
- `emails.templates`: Manages email templates. TODO: Add support for email templates.
- `emails.accounts`: Manages email users.

## `emails.outbound` Service

The `emails.outbound` service is designed for handling outbound email communication. It is responsible for sending emails, managing email pools, and integrating with a database for persistence.

- [Documentation](docs/outbound.md)

## `emails.inbound` Service

The `emails.inbound` service is an inbound SMTP server designed to handle incoming email messages. It provides functionality for receiving, processing, and storing incoming emails.

- [Documentation](docs/inbound.md)

## `emails.messages` Service

The `emails.messages` service is designed for managing email messages, including storing, parsing, signing, queuing, and adding additional information to email messages.

- [Documentation](docs/messages.md)