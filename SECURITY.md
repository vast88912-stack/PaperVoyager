# Security Policy

## API Keys

PaperVoyager can call external model providers during generation and evaluation. Configure credentials through environment variables or a local `.env` file copied from `.env.example`.

Never commit real credentials. This repository intentionally ignores `.env` and `.env.*` files.

## Reporting Issues

If you find a leaked credential, unsafe default, or security-sensitive issue, please rotate the affected credential immediately and open a private report through the repository maintainers' preferred channel.

