# 🎮 FlowFun Party

> A thrilling blockchain arcade game built on Flow EVM where strategy and skill matter!

![FlowFun Party](readme.png)

## 🌟 Overview

FlowFun Party is an exciting skill-based arcade game deployed on the Flow blockchain. Players navigate through increasingly challenging levels by making strategic choices with different risk/reward ratios. Test your decision-making skills and see how far you can climb!

## 🎯 Features

### 🎲 Progressive Challenge System

- **7 Skill Levels**: From conservative 1.1x to extreme 10x multipliers
- **Strategic Progression**: Each successful choice unlocks higher difficulty tiers
- **Dynamic Challenge**: Fewer tiles and higher stakes as you advance

### 💰 Multiplier Tiers

| Multiplier | Win Chance | Description                 |
| ---------- | ---------- | --------------------------- |
| 1.1x       | 83.6%      | Conservative - High safety  |
| 1.25x      | 72.8%      | Safe - Good balance         |
| 1.5x       | 58.7%      | Balanced - Moderate risk    |
| 2x         | 44.0%      | Risky - Higher rewards      |
| 3x         | 29.0%      | High Risk - Big multiplier  |
| 5x         | 17.2%      | Extreme - Major gains       |
| 10x        | 8.5%       | Insane - Maximum multiplier |

### 🔥 Game Modes

- **🎮 Demo Mode**: Practice and learn the mechanics
- **💎 Real Game**: Play with FLOW tokens for real rewards
- **🏆 Progressive Levels**: Unlock higher multipliers as you master the game

### 🛡️ Web3 Integration

- **Flow EVM Support**: Built on Flow blockchain (Chain ID: 747)
- **Wallet Integration**: MetaMask and Rabby wallet support
- **Real-time Balance**: Live FLOW balance tracking
- **Transaction Parsing**: Smart contract event monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Flow EVM compatible wallet (MetaMask, Rabby)
- Some FLOW tokens for playing

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/flowfun.git
cd flowfun

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Environment Setup

Ensure your wallet is configured for Flow EVM:

- **Network Name**: Flow EVM
- **Chain ID**: 747
- **RPC URL**: Flow EVM RPC endpoint

## 🎮 How to Play

### 1. Connect Your Wallet

- Click "Connect Wallet" and select MetaMask or Rabby
- Ensure you're on Flow EVM (Chain ID: 747)
- Make sure you have FLOW tokens for entry

### 2. Start a Game

- Enter your entry amount (minimum 0.001 FLOW)
- Click "Start Game" to begin
- Your entry becomes your initial score pool

### 3. Make Strategic Choices

- Each level presents tiles to choose from
- Click a tile to make your choice
- **Safe tiles**: Multiply your score and advance
- **Challenge tiles**: End the game but test your skills

### 4. Cash Out or Continue

- After each successful choice, decide:
  - **Cash Out**: Secure your current score
  - **Continue**: Push for higher multipliers and rewards

### 5. Progressive Difficulty

- Start with 1.1x multiplier (7 tiles, 83.6% success rate)
- Successfully advance to unlock higher tiers
- Reach 10x multiplier (3 tiles, 8.5% success rate) for maximum challenge

## 🛠️ Tech Stack

### Frontend

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Wagmi**: Web3 React hooks
- **Viem**: TypeScript Ethereum library

### Blockchain

- **Flow EVM**: Ethereum-compatible Flow blockchain
- **Solidity**: Smart contract language
- **OpenZeppelin**: Security-focused contract libraries

### Development

- **Biome**: Fast linting and formatting
- **CSS3**: Custom styling with modern features
- **Web3Modal**: Wallet connection interface

## 📱 Smart Contract

The FlowFun contract implements:

- **Secure randomness**: Pseudorandom number generation
- **Event emission**: Choice outcomes and game state
- **Reentrancy protection**: OpenZeppelin security
- **Owner controls**: Emergency functions and management

### Contract Address

```
0xc97a8e7Fe83d3941a10D5f791F5cf3E6Ef88f57c
```

## 🎨 Design Features

- **Dark green theme**: Professional arcade aesthetic
- **Responsive design**: Works on desktop and mobile
- **Smooth animations**: Engaging tile interactions
- **Real-time feedback**: Loading states and transaction status
- **Progressive UI**: Visual indicators for game progression

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code Quality
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
```

### Project Structure

```
src/
├── App.tsx           # Main application component
├── ABI.ts           # Smart contract ABI
├── wagmi.ts         # Web3 configuration
├── index.css        # Global styles
└── main.tsx         # Application entry point
```

## ⚠️ Game Disclaimer

FlowFun Party is a skill-based arcade game involving cryptocurrency rewards. Please:

- **Play Responsibly**: Only use amounts you're comfortable with
- **Understand the Mechanics**: Each choice has clearly displayed probabilities
- **Practice First**: Use demo mode to learn the game mechanics
- **Have Fun**: It's designed to be an entertaining challenge!

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://flowfun.party](https://flowfun.party)
- **Flow EVM Docs**: [Flow EVM Documentation](https://developers.flow.com/evm/about)
- **Contract Source**: View on Flow block explorer

---

**Built with ❤️ on Flow blockchain**

_Ready to test your skills? Connect your wallet and start playing!_ 🎮✨
