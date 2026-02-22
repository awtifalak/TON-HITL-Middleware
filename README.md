# TON HITL Middleware

A Human-in-the-Loop (HITL) middleware system designed to secure and control AI agent interactions with the TON blockchain via the Model Context Protocol (MCP).

This project acts as an intermediary layer between an autonomous AI agent and the `@ton/mcp` wallet server. It ensures that any state-changing operations (like sending TON or Jettons, or executing smart contracts) require explicit human approval via a Telegram bot, while read-only queries are executed immediately.

## Features

- **Model Context Protocol (MCP) Integration**: Seamlessly hooks into the `@ton/mcp` server.
- **Telegram Bot Approvals**: Get real-time notifications with transaction details directly on Telegram.
- **Granular Permissions Flow**:
  - **Read-Only**: Instantly allows queries like `get_wallet`, `get_balance`, `get_transactions`, etc.
  - **State-Changing**: Intercepts actions like `send_ton`, `send_jetton`, `send_raw_transaction` and pends execution until the trusted human user clicks ✅ Approve or ❌ Reject.
- **Session Expiry**: Action requests automatically expire after 15 minutes to preserve security.
- **Mock AI Agent**: Includes an `exampleAgent.ts` script to demonstrate and test the system workflow locally.

## Architecture Pipeline

```text
+----------+          +-------------------------+          +-----------------------+
|          |          |                         |          |                       |
| AI Agent |   ====>  |   TON HITL Middleware   |   ====>  |  @ton/mcp Server &    |
|          | (stdI/O) |  (Intercepts tools/call)| (Action) |  @ton/walletkit       |
+----------+          +-------------------------+          +-----------------------+
                                  |
                           (Wait for Approval)
                                  v
                        +-------------------+
                        |                   |
                        |   Telegram Bot    |
                        | (Admin Interface) |
                        +-------------------+
```

## Prerequisites

- **Node.js**: v18+ (v22+ recommended for standard `@ton/mcp` compatibility).
- **TypeScript**: The project is written in TS.
- **Telegram Bot Token**: Created via [@BotFather](https://t.me/botfather).
- **Telegram User ID**: Your personal Telegram ID (`@userinfobot` can help you find this).
- **TON Wallet**: Your 24-word seed phrase (Mnemonic) to act as the agent's wallet.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/awtifalak/TON-HITL-Middleware.git
   cd TON-HITL-Middleware
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the root directory based on the provided `.env.example`:

```bash
cp .env.example .env
```

Fill in your configuration details:

```env
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"       # From @BotFather
TELEGRAM_USER_ID="123456789"                        # Your personal Telegram User ID
MNEMONIC="word1 word2 word3 ... word24"             # Your TON Wallet 24-word seed phrase
NETWORK="testnet"                                   # "testnet" or "mainnet"
TONCENTER_API_KEY=""                                # (Optional) Higher rate limits for Toncenter
```

> **Warning:** Never commit your `.env` file or expose your Mnemonic to public repositories.

## Usage

### Development Mode

You can run the application directly using `ts-node`:

```bash
npm run dev
```

### Production Build

Compile to JavaScript and run:

```bash
npm run build
npm start
```

### Flow of Execution

1. The script initializes the Telegram bot and the MCP server.
2. The example AI agent simulates a connection in 5 seconds.
3. **Scenario 1:** The agent calls `get_wallet` (Read-only). The middleware executes it directly and logs the response.
4. **Scenario 2:** The agent calls `send_ton` (State-changing). The middleware intercepts the tool call.
5. The Telegram Bot sends a message to your specified user ID with the transaction request payload and Inline Keyboard buttons (Approve / Reject).
6. **If Approved:** The middleware resumes the execution on the MCP server and transfers the assets.
7. **If Rejected (or Timeout):** The middleware throws an error back to the agent, refusing execution.

## Supported MCP Tools

The middleware distinguishes tools broadly into two specific lists found in `src/mcp/middleware.ts`.

**Read-Only Tools (No approval needed):**
- `get_wallet`, `get_balance`, `get_jetton_balance`, `get_jettons`, `get_transactions`, `get_swap_quote`, `get_nfts`, `get_nft`, `resolve_dns`, `back_resolve_dns`, `get_known_jettons`.

**State-Changing Tools (Requires Telegram approval):**
- `send_ton`, `send_jetton`, `send_nft`, `send_raw_transaction`.

## Project Structure

```text
├── src/
│   ├── agent/       # Example autonomous agent to trigger workflows
│   ├── bot/         # Telegram bot connection & handlers
│   ├── mcp/         # Middleware to monkey-patch and intercept `@ton/mcp` logic
│   └── shared/      # Shared events bus and request state store
├── package.json
└── tsconfig.json
```

## License

MIT License

## Donation

If you find this project useful and would like to support its development, you can donate TON to:

```
UQBe9ai1rktFr8pDQlb-iBEkpVDiKAqrXALdu8GRr7GYuZCc
```

Thank you for your support!
