# Smart Forwarding Configuration

The smart forwarding system allows you to configure timing values to control when messages are forwarded immediately vs. batched.

## Environment Variables

### `LETTA_GORP_TIMEOUT`
- **Default**: `5` (minutes)
- **Description**: How long to continue immediate forwarding after Gorp is mentioned or sends a message
- **Example**: `LETTA_GORP_TIMEOUT=10` (10 minutes)

### `LETTA_BATCH_INTERVAL`
- **Default**: `30` (minutes)
- **Description**: How often to send batch updates for channels without recent Gorp interaction
- **Example**: `LETTA_BATCH_INTERVAL=15` (15 minutes)

## Configuration Examples

### Quick Response Mode
```bash
LETTA_GORP_TIMEOUT=2
LETTA_BATCH_INTERVAL=10
```
- Immediate forwarding for 2 minutes after Gorp interaction
- Batch updates every 10 minutes

### Balanced Mode (Default)
```bash
LETTA_GORP_TIMEOUT=5
LETTA_BATCH_INTERVAL=30
```
- Immediate forwarding for 5 minutes after Gorp interaction
- Batch updates every 30 minutes

### Conservative Mode
```bash
LETTA_GORP_TIMEOUT=10
LETTA_BATCH_INTERVAL=60
```
- Immediate forwarding for 10 minutes after Gorp interaction
- Batch updates every hour

## How It Works

1. **Immediate Forwarding**: Messages are sent to Letta immediately when:
   - Gorp is mentioned (with or without @)
   - Gorp sends a message
   - Within `LETTA_GORP_TIMEOUT` minutes of Gorp's last interaction

2. **Batch Updates**: Messages are collected and sent every `LETTA_BATCH_INTERVAL` minutes when:
   - No Gorp mention in the channel
   - No Gorp message in the channel
   - More than `LETTA_GORP_TIMEOUT` minutes since Gorp's last interaction

## Commands

- `@gorp activity-status` - View current timing configuration and channel status
- `@gorp toggle-smart-forward` - Enable/disable smart forwarding
- `@gorp letta-status` - View overall Letta integration status

## Notes

- Changes to environment variables require a bot restart
- Timing values are in minutes (will be converted to milliseconds internally)
- Minimum recommended values: 1 minute for timeout, 5 minutes for batch interval
- Maximum recommended values: 60 minutes for timeout, 240 minutes (4 hours) for batch interval
