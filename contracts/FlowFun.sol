// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FlowFun
 * @dev Simple gambling contract where players make choices with different risk/reward ratios
 */
contract FlowFun is Ownable, ReentrancyGuard {
    // ===================
    // State Variables
    // ===================

    uint256 public gameCounter;
    uint256 public minimumBet = 0.001 ether;

    struct Choice {
        uint256 multiplier; // multiplier in basis points (10000 = 1x)
        uint256 winChance; // chance to win in basis points (10000 = 100%)
        string description;
    }

    struct Game {
        address player;
        uint256 totalWinnings;
        uint256 lastBet;
        bool active;
        uint256 gamesPlayed;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerToGameId;

    Choice[7] public choices;

    // ===================
    // Events
    // ===================

    event GameStarted(
        uint256 indexed gameId,
        address indexed player,
        uint256 betAmount
    );
    event ChoiceMade(
        uint256 indexed gameId,
        uint256 choiceIndex,
        bool won,
        uint256 winnings
    );
    event Payout(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount
    );
    event GameEnded(uint256 indexed gameId, address indexed player);

    // ===================
    // Constructor
    // ===================

    constructor() Ownable(msg.sender) {
        // Initialize choices with different risk/reward ratios (heavily favoring house)
        choices[0] = Choice(
            11000,
            8364,
            "Conservative: 1.1x multiplier, 83.6% win chance"
        );
        choices[1] = Choice(
            12500,
            7280,
            "Safe: 1.25x multiplier, 72.8% win chance"
        );
        choices[2] = Choice(
            15000,
            5867,
            "Balanced: 1.5x multiplier, 58.7% win chance"
        );
        choices[3] = Choice(
            20000,
            4400,
            "Risky: 2x multiplier, 44% win chance"
        );
        choices[4] = Choice(
            30000,
            2900,
            "High Risk: 3x multiplier, 29% win chance"
        );
        choices[5] = Choice(
            50000,
            1720,
            "Extreme: 5x multiplier, 17.2% win chance"
        );
        choices[6] = Choice(
            100000,
            850,
            "Insane: 10x multiplier, 8.5% win chance"
        );
    }

    // ===================
    // External Functions
    // ===================

    /**
     * @notice Start a new game or add to existing game
     */
    function enterGame() external payable {
        require(msg.value >= minimumBet, "Bet too small");

        uint256 gameId = playerToGameId[msg.sender];

        if (gameId == 0) {
            // New game
            gameCounter++;
            gameId = gameCounter;
            playerToGameId[msg.sender] = gameId;

            games[gameId] = Game({
                player: msg.sender,
                totalWinnings: msg.value,
                lastBet: msg.value,
                active: true,
                gamesPlayed: 0
            });

            emit GameStarted(gameId, msg.sender, msg.value);
        } else {
            // Add to existing game
            Game storage game = games[gameId];
            require(game.active, "Game not active");

            game.totalWinnings += msg.value;
            game.lastBet = msg.value;
        }
    }

    /**
     * @notice Make a choice and play
     * @param choiceIndex Index of the choice (0-6)
     */
    function makeChoice(uint256 choiceIndex) external {
        require(choiceIndex < 7, "Invalid choice");

        uint256 gameId = playerToGameId[msg.sender];
        require(gameId > 0, "No active game");

        Game storage game = games[gameId];
        require(game.active, "Game not active");
        require(game.player == msg.sender, "Not your game");
        require(game.totalWinnings > 0, "No winnings to play with");

        Choice memory choice = choices[choiceIndex];

        // Generate pseudorandom number
        uint256 randomNumber = _generateRandom(gameId, game.gamesPlayed);
        bool won = randomNumber < choice.winChance;

        game.gamesPlayed++;

        if (won) {
            // Apply multiplier to total winnings
            game.totalWinnings =
                (game.totalWinnings * choice.multiplier) /
                10000;
            emit ChoiceMade(gameId, choiceIndex, true, game.totalWinnings);
        } else {
            // Lost - game ends
            game.totalWinnings = 0;
            game.active = false;
            delete playerToGameId[msg.sender];
            emit ChoiceMade(gameId, choiceIndex, false, 0);
            emit GameEnded(gameId, msg.sender);
        }
    }

    /**
     * @notice Cash out winnings
     */
    function cashOut() external nonReentrant {
        uint256 gameId = playerToGameId[msg.sender];
        require(gameId > 0, "No game found");

        Game storage game = games[gameId];
        require(game.player == msg.sender, "Not your game");
        require(game.totalWinnings > 0, "No winnings to cash out");

        uint256 payout = game.totalWinnings;

        // Reset game state
        game.totalWinnings = 0;
        game.active = false;
        delete playerToGameId[msg.sender];

        // Send payout
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Payout failed");

        emit Payout(gameId, msg.sender, payout);
        emit GameEnded(gameId, msg.sender);
    }

    // ===================
    // View Functions
    // ===================

    /**
     * @notice Get all available choices
     */
    function getChoices() external view returns (Choice[7] memory) {
        return choices;
    }

    /**
     * @notice Get game info for a player
     */
    function getGameInfo(
        address player
    )
        external
        view
        returns (
            uint256 gameId,
            uint256 totalWinnings,
            uint256 lastBet,
            bool active,
            uint256 gamesPlayed
        )
    {
        gameId = playerToGameId[player];
        if (gameId > 0) {
            Game memory game = games[gameId];
            return (
                gameId,
                game.totalWinnings,
                game.lastBet,
                game.active,
                game.gamesPlayed
            );
        }
        return (0, 0, 0, false, 0);
    }

    /**
     * @notice Get current winnings for a player
     */
    function getCurrentWinnings(
        address player
    ) external view returns (uint256) {
        uint256 gameId = playerToGameId[player];
        if (gameId > 0) {
            return games[gameId].totalWinnings;
        }
        return 0;
    }

    // ===================
    // Internal Functions
    // ===================

    /**
     * @dev Generate pseudorandom number (0-9999)
     * Note: This is not cryptographically secure randomness
     */
    function _generateRandom(
        uint256 gameId,
        uint256 nonce
    ) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        block.prevrandao,
                        msg.sender,
                        gameId,
                        nonce
                    )
                )
            ) % 10000;
    }

    // ===================
    // Owner Functions
    // ===================

    /**
     * @notice Withdraw house profits
     */
    function withdrawProfits(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Update minimum bet
     */
    function setMinimumBet(uint256 _minimumBet) external onlyOwner {
        minimumBet = _minimumBet;
    }

    /**
     * @notice Emergency stop a player's game
     */
    function emergencyStopGame(address player) external onlyOwner {
        uint256 gameId = playerToGameId[player];
        if (gameId > 0) {
            games[gameId].active = false;
            emit GameEnded(gameId, player);
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
