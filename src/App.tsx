import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther, decodeEventLog } from "viem";
import { ABI } from "./ABI";

const CONTRACT_ADDRESS = "0xc97a8e7Fe83d3941a10D5f791F5cf3E6Ef88f57c" as const; // TODO: Set contract address



// Modal Component
function WalletModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { connectors, connect, status, error } = useConnect();
  const account = useAccount();

  // Close modal if wallet gets connected
  useEffect(() => {
    if (account.status === "connected") {
      onClose();
    }
  }, [account.status, onClose]);

  if (!isOpen) return null;

  // Filter to only show Rabby and MetaMask
  const allowedConnectors = connectors.filter(
    (connector) =>
      connector.name.toLowerCase().includes("metamask") ||
      connector.name.toLowerCase().includes("rabby")
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect Wallet</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {account.status === "connected" ? (
          <p className="modal-subtitle">✅ Wallet already connected!</p>
        ) : (
          <p className="modal-subtitle">
            Choose your preferred wallet to get started
          </p>
        )}

        <div className="connector-grid">
          {allowedConnectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                // Only try to connect if not already connected
                if (account.status !== "connected") {
                  connect({ connector });
                }
              }}
              type="button"
              className="btn"
              disabled={status === "pending" || account.status === "connected"}
            >
              {connector.name}
            </button>
          ))}
        </div>

        {status === "pending" && (
          <div className="status connecting">Connecting...</div>
        )}

        {error && (
          <div className="error">
            <strong>Connection Error:</strong> {error.message}
          </div>
        )}
      </div>
    </div>
  );
}

// Navbar Component
function Navbar({ onConnectClick }: { onConnectClick: () => void }) {
  const account = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: account.address,
    chainId: 747,
    query: {
      enabled: account.status === "connected" && account.chainId === 747,
    },
  });

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <img src="/logo.png" alt="FlowFun" className="logo" />
        </div>

        <div className="navbar-actions">
          {account.status === "connected" ? (
            <div className="connected-info">
              <div className="wallet-info">
                <span className="wallet-address">
                  {account.addresses?.[0]?.slice(0, 6)}...
                  {account.addresses?.[0]?.slice(-4)}
                </span>
                <div className="wallet-details">
                  {account.chainId === 747 && (
                    <span className="flow-balance">
                      {balanceLoading
                        ? "Loading..."
                        : balance && balance.formatted
                        ? `${Number(balance.formatted).toFixed(4)} FLOW`
                        : "0.0000 FLOW"}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => disconnect()}
                className="btn btn-secondary"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button type="button" onClick={onConnectClick} className="btn">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

// Game Component
function TileGame({ onConnectClick }: { onConnectClick: () => void }) {
  const account = useAccount();
  const { switchChain } = useSwitchChain();
  const [gameState, setGameState] = useState<"playing" | "lost" | "cashed-out">(
    "playing"
  );
  const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set());
  const [catPositions, setCatPositions] = useState<Set<string>>(new Set());
  const [completedRows, setCompletedRows] = useState<Set<string>>(new Set());
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [totalRows, setTotalRows] = useState(3);
  const [level, setLevel] = useState(1);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [chainSwitchError, setChainSwitchError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState("0.001");
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashedOutAmount, setCashedOutAmount] = useState("0");
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const REQUIRED_CHAIN_ID = 747;
  const isWalletConnected = account.status === "connected";
  const isCorrectChain = account.chainId === REQUIRED_CHAIN_ID;
  const canPlay = (isWalletConnected && isCorrectChain) || isDemoMode;

  // Contract reads
  const { data: gameInfo, refetch: refetchGameInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getGameInfo",
    args: [account.address],
    query: {
      enabled: isWalletConnected && isCorrectChain,
    },
  });

  const { data: choices } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getChoices",
    query: {
      enabled: isWalletConnected && isCorrectChain,
    },
  });

  // Get user's FLOW balance for validation
  const { data: userBalance, refetch: refetchBalance } = useBalance({
    address: account.address,
    chainId: 747,
    query: {
      enabled: isWalletConnected && isCorrectChain,
    },
  });

  // Contract writes
  const {
    writeContract: enterGame,
    data: enterGameHash,
    isPending: isEnteringGame,
  } = useWriteContract();
  const {
    writeContract: makeChoice,
    data: makeChoiceHash,
    isPending: isMakingChoice,
  } = useWriteContract();
  const {
    writeContract: cashOut,
    data: cashOutHash,
  } = useWriteContract();

  // Transaction receipts with auto-refresh
  const { isLoading: isEnterGameLoading, isSuccess: enterGameSuccess } =
    useWaitForTransactionReceipt({
      hash: enterGameHash,
    });
  const {
    isLoading: isMakeChoiceLoading,
    isSuccess: makeChoiceSuccess,
    isError: makeChoiceError,
    data: makeChoiceReceipt,
  } = useWaitForTransactionReceipt({
    hash: makeChoiceHash,
  });
  const { isSuccess: cashOutSuccess } = useWaitForTransactionReceipt({
    hash: cashOutHash,
  });

  // Extract game data from contract
  const hasActiveGame = gameInfo ? (gameInfo as any)[3] : false; // active
  const contractWinnings = gameInfo ? (gameInfo as any)[1] : 0n; // totalWinnings
  const contractGamesPlayed = gameInfo ? (gameInfo as any)[4] : 0n; // gamesPlayed
  const displayWinnings = contractWinnings
    ? formatEther(contractWinnings)
    : "0";

  // Check if user has enough balance for bet
  const currentBalance = userBalance ? Number(userBalance.formatted) : 0;
  const betAmountNumber = Number(betAmount);
  const hasInsufficientFunds = betAmountNumber > currentBalance;
  const canStartGame = !hasInsufficientFunds && betAmountNumber >= 0.001;

  // Convert contract choices to display format
  const getMultiplierDisplay = () => {
    if (isDemoMode) {
      return `${rows[currentRowIndex]?.multiplier}x`;
    }

    if (!choices) {
      return "1.1x";
    }

    // Show current multiplier based on rounds completed
    if (hasActiveGame && choices) {
      const roundsCompleted = Number(contractGamesPlayed);
      const choiceIndex = Math.min(roundsCompleted, 6); // Cap at max choice index
      const currentChoice = (choices as any[])[choiceIndex];
      if (currentChoice) {
        const mult = Number(currentChoice.multiplier) / 10000;
        return `${mult}x`;
      }
    }

    return "1.1x";
  };

  const generateRow = (level: number) => {
    const baseMultiplier = 1.1;
    const multiplierIncrease = 0.22;
    const multiplier = baseMultiplier + (level - 1) * multiplierIncrease;

    // Increase tiles and cats as level goes up
    const baseTiles = level === 1 ? 7 : level === 2 ? 7 : 5;
    const tiles = Math.min(baseTiles + Math.floor((level - 1) / 3), 10); // Cap at 10 tiles

    return {
      multiplier: Number(multiplier.toFixed(2)),
      tiles,
      id: `row${level}`,
      level,
    };
  };

  // Generate rows based on game mode
  const getGameRows = () => {
    if (isDemoMode || !hasActiveGame || !choices) {
      // Use demo-style generated rows
      return Array.from({ length: totalRows }, (_, index) =>
        generateRow(totalRows - index)
      );
    }

    // Use contract multipliers for real game
    const roundsCompleted = Number(contractGamesPlayed);
    const contractMultipliers = [
      { multiplier: 1.1, tiles: 7 }, // choice 0
      { multiplier: 1.25, tiles: 7 }, // choice 1
      { multiplier: 1.5, tiles: 7 }, // choice 2
      { multiplier: 2, tiles: 6 }, // choice 3
      { multiplier: 3, tiles: 5 }, // choice 4
      { multiplier: 5, tiles: 4 }, // choice 5
      { multiplier: 10, tiles: 3 }, // choice 6
    ];

    // Show next 3 multipliers starting from current position
    const startIndex = Math.max(0, roundsCompleted);
    const endIndex = Math.min(contractMultipliers.length, startIndex + 3);

    return contractMultipliers
      .slice(startIndex, endIndex)
      .map((choice, index) => ({
        multiplier: choice.multiplier,
        tiles: choice.tiles,
        id: `row${startIndex + index}`,
        level: startIndex + index + 1,
      }))
      .reverse(); // Reverse so highest is on top
  };

  const rows = getGameRows();

  const initializeGame = () => {
    setGameState("playing");
    setRevealedTiles(new Set());
    setCompletedRows(new Set());
    setTotalRows(3);
    setLevel(1);
    setCurrentRowIndex(2); // Start with the bottom row (1.10x)
    setSelectedTile(null);

    // Generate new cat positions for current rows
    const newCatPositions = new Set<string>();
    Array.from({ length: 3 }, (_, index) => {
      const row = generateRow(3 - index);
      const randomTile = Math.floor(Math.random() * row.tiles);
      newCatPositions.add(`${row.id}-${randomTile}`);
    });
    setCatPositions(newCatPositions);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  // Refetch data after successful transactions
  useEffect(() => {
    if (enterGameSuccess) {
      refetchGameInfo();
      refetchBalance();
    }
  }, [enterGameSuccess, refetchGameInfo, refetchBalance]);

  useEffect(() => {
    if (makeChoiceSuccess && makeChoiceReceipt) {
      // Parse transaction logs to determine if player won or lost
      try {
        const choiceMadeLog = makeChoiceReceipt.logs.find(log => {
          try {
            const decoded = decodeEventLog({
              abi: ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === 'ChoiceMade';
          } catch {
            return false;
          }
        });

        if (choiceMadeLog) {
          const decoded = decodeEventLog({
            abi: ABI,
            data: choiceMadeLog.data,
            topics: choiceMadeLog.topics,
          });
          
          const args = decoded.args as unknown as { gameId: bigint; choiceIndex: bigint; won: boolean; winnings: bigint };
          const won = args.won;
          
          if (!won) {
            // Player lost - game ended
            setGameState("lost");
          }
        }
      } catch (error) {
        console.error("Error parsing transaction logs:", error);
      }

      refetchGameInfo();
      refetchBalance();
      setSelectedTile(null); // Clear selected tile on success
    }
  }, [makeChoiceSuccess, makeChoiceReceipt, refetchGameInfo, refetchBalance]);

  useEffect(() => {
    if (makeChoiceError) {
      setSelectedTile(null); // Clear selected tile on error
    }
  }, [makeChoiceError]);

  useEffect(() => {
    if (cashOutSuccess) {
      refetchGameInfo();
      refetchBalance();
      setShowCashOutModal(true);
    }
  }, [cashOutSuccess, refetchGameInfo, refetchBalance]);

  const handleTileClick = async (
    rowId: string,
    tileIndex: number,
    multiplier: number
  ) => {
    if (!canPlay || gameState !== "playing") return;

    const tileId = `${rowId}-${tileIndex}`;

    if (isDemoMode) {
      // Keep original demo logic
      if (revealedTiles.has(tileId)) return;

      const rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < currentRowIndex) return;

      const newRevealed = new Set(revealedTiles);
      newRevealed.add(tileId);
      setRevealedTiles(newRevealed);

      if (catPositions.has(tileId)) {
        setGameState("lost");
      } else {
        const currentRowRevealed = Array.from(newRevealed).some(
          (tile) => tile.startsWith(rowId) && !catPositions.has(tile)
        );

        if (currentRowRevealed && !completedRows.has(rowId)) {
          const newCompletedRows = new Set(completedRows);
          newCompletedRows.add(rowId);
          setCompletedRows(newCompletedRows);

          if (currentRowIndex > 0) {
            setCurrentRowIndex(currentRowIndex - 1);
          } else {
            const newLevel = level + 1;
            const newTotalRows = totalRows + 2;
            setLevel(newLevel);
            setTotalRows(newTotalRows);

            const newCatPositions = new Set(catPositions);
            for (let i = totalRows + 1; i <= newTotalRows; i++) {
              const newRow = generateRow(i);
              const randomTile = Math.floor(Math.random() * newRow.tiles);
              newCatPositions.add(`${newRow.id}-${randomTile}`);
            }
            setCatPositions(newCatPositions);
            setCurrentRowIndex(1);
          }
        }
      }
      return;
    }

    // Real game logic with contract
    if (!hasActiveGame) {
      console.log("No active game - please start a game first");
      return;
    }

    // Set selected tile for loading state
    setSelectedTile(tileId);

    // For real games, use the multiplier to determine choice index
    // Contract multipliers: 1.1x=0, 1.25x=1, 1.5x=2, 2x=3, 3x=4, 5x=5, 10x=6
    const contractChoiceMap: { [key: number]: number } = {
      1.1: 0,
      1.25: 1,
      1.5: 2,
      2: 3,
      3: 4,
      5: 5,
      10: 6,
    };

    const choiceIndex = contractChoiceMap[multiplier];
    if (choiceIndex === undefined) {
      console.error("Invalid multiplier:", multiplier);
      setSelectedTile(null);
      return;
    }

    try {
      await makeChoice({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "makeChoice",
        args: [choiceIndex],
      });
    } catch (error) {
      console.error("Failed to make choice:", error);
      setSelectedTile(null);
    }
  };

  const handleCashOut = async () => {
    if (!canPlay || isDemoMode) {
      setGameState("cashed-out");
      return;
    }

    try {
      // Store the amount before transaction (it will be zeroed after)
      setCashedOutAmount(displayWinnings);

      await cashOut({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "cashOut",
      });
    } catch (error) {
      console.error("Failed to cash out:", error);
    }
  };

  const getTileContent = (rowId: string, tileIndex: number) => {
    const tileId = `${rowId}-${tileIndex}`;

    // Show loading spinner for selected tile during transaction
    if (selectedTile === tileId && (isMakingChoice || isMakeChoiceLoading)) {
      return "⏳";
    }

    if (!revealedTiles.has(tileId)) return null;

    if (catPositions.has(tileId)) {
      return "💀";
    }
    return "✓";
  };

  const getTileClass = (rowId: string, tileIndex: number) => {
    const tileId = `${rowId}-${tileIndex}`;
    const isRevealed = revealedTiles.has(tileId);
    const hasCat = catPositions.has(tileId);
    const rowIndex = rows.findIndex((row) => row.id === rowId);
    const isUnlocked = rowIndex >= currentRowIndex;
    const isSelected = selectedTile === tileId;
    const isLoading = isSelected && (isMakingChoice || isMakeChoiceLoading);

    // Check if any tile in this row has been revealed
    const rowHasRevealedTile = Array.from(revealedTiles).some((tile) =>
      tile.startsWith(rowId)
    );

    let className = "game-tile";
    if (isLoading) {
      className += " tile-loading";
    } else if (isRevealed) {
      className += hasCat ? " tile-death" : " tile-safe";
    } else if (!isUnlocked) {
      className += " tile-locked";
    } else if (rowHasRevealedTile) {
      className += " tile-disabled";
    }
    return className;
  };

  return (
    <>
      <div className="game-layout">
        <div className="game-main">
          <div className="game-header">
            <div className="game-title">
              <h2>FlowFun Party</h2>
              <div className="game-level">Level {level}</div>
            </div>
          </div>

          <div className="game-board">
            {rows.map((row, index) => {
              // For real games, determine unlock status based on rounds completed
              const isUnlocked = isDemoMode
                ? index >= currentRowIndex
                : hasActiveGame
                ? Number(contractGamesPlayed) >= rows.length - 1 - index // Bottom row first
                : index === rows.length - 1; // Only bottom row unlocked for non-active games

              const distanceFromCurrent = isDemoMode
                ? Math.max(0, currentRowIndex - index)
                : hasActiveGame
                ? Math.max(
                    0,
                    rows.length - 1 - Number(contractGamesPlayed) - index
                  )
                : Math.max(0, rows.length - 1 - index);

              const opacity =
                distanceFromCurrent === 0
                  ? 1
                  : Math.max(0.3, 1 - distanceFromCurrent * 0.2);
              const scale =
                distanceFromCurrent === 0
                  ? 1
                  : Math.max(0.8, 1 - distanceFromCurrent * 0.05);

              return (
                <div
                  key={row.id}
                  className={`game-row ${
                    completedRows.has(row.id) ? "row-completed" : ""
                  } ${isUnlocked ? "row-unlocked" : "row-locked"}`}
                  style={{
                    opacity,
                    transform: `scale(${scale}) translateY(${
                      distanceFromCurrent * -2
                    }px)`,
                    zIndex: rows.length - index,
                  }}
                >
                  <div className="row-multiplier">{row.multiplier}x</div>
                  <div className="tiles-container">
                    {Array.from({ length: row.tiles }, (_, tileIndex) => (
                      <button
                        key={tileIndex}
                        className={getTileClass(row.id, tileIndex)}
                        onClick={() =>
                          handleTileClick(row.id, tileIndex, row.multiplier)
                        }
                        disabled={
                          !canPlay ||
                          gameState !== "playing" ||
                          !isUnlocked ||
                          (isDemoMode &&
                            Array.from(revealedTiles).some((tile) =>
                              tile.startsWith(row.id)
                            ) &&
                            !revealedTiles.has(`${row.id}-${tileIndex}`))
                        }
                      >
                        {getTileContent(row.id, tileIndex)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {!canPlay && !isWalletConnected && (
            <div className="connect-prompt">
              <div className="button-row">
                <button
                  type="button"
                  onClick={onConnectClick}
                  className="btn btn-large"
                >
                  Connect Wallet
                </button>
                <span className="prompt-or">or</span>
                <button
                  type="button"
                  onClick={() => setIsDemoMode(true)}
                  className="btn btn-secondary btn-large"
                >
                  Play Demo
                </button>
              </div>
            </div>
          )}

          {isWalletConnected && isCorrectChain && !hasActiveGame && (
            <div className="connect-prompt">
              <div className="button-row-with-input">
                <div className="bet-input-section-inline">
                  <label htmlFor="betAmount">Bet Amount (FLOW)</label>
                  <input
                    id="betAmount"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className={`bet-input ${
                      hasInsufficientFunds ? "bet-input-error" : ""
                    }`}
                  />
                  <div className="balance-info">
                    Balance: {currentBalance.toFixed(4)} FLOW
                    {hasInsufficientFunds && (
                      <span className="error-text"> - Insufficient funds</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await enterGame({
                        address: CONTRACT_ADDRESS,
                        abi: ABI,
                        functionName: "enterGame",
                        value: parseEther(betAmount),
                      });
                    } catch (error) {
                      console.error("Failed to start game:", error);
                    }
                  }}
                  className="btn btn-large"
                  disabled={
                    isEnteringGame || isEnterGameLoading || !canStartGame
                  }
                >
                  {isEnteringGame || isEnterGameLoading
                    ? "Starting..."
                    : hasInsufficientFunds
                    ? "Insufficient FLOW"
                    : "Start Game"}
                </button>
                <span className="prompt-or">or</span>
                <button
                  type="button"
                  onClick={() => setIsDemoMode(true)}
                  className="btn btn-secondary btn-large"
                >
                  Play Demo
                </button>
              </div>
            </div>
          )}

          {isWalletConnected && !isCorrectChain && (
            <div className="connect-prompt">
              <div className="chain-warning">
                <p className="prompt-text">
                  ⚠️ Connected to chain {account.chainId} • FlowFun requires
                  chain 747
                </p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setChainSwitchError(null);
                      await switchChain({ chainId: REQUIRED_CHAIN_ID as any });
                    } catch (error) {
                      console.error("Chain switch error:", error);
                      setChainSwitchError(
                        "Failed to switch chain. You may need to add chain 747 to your wallet manually."
                      );
                    }
                  }}
                  className="btn btn-large"
                >
                  Switch to Chain 747
                </button>
                <span className="prompt-or">or</span>
                <button
                  type="button"
                  onClick={() => setIsDemoMode(true)}
                  className="btn btn-secondary btn-large"
                >
                  Play Demo
                </button>
              </div>
              {chainSwitchError && (
                <div
                  className="error"
                  style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}
                >
                  {chainSwitchError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <div className="score-panel">
            <div className="score-header">
              <h3>Current Score</h3>
            </div>
            <div className="score-display">
              <div className="score-value">{displayWinnings} FLOW</div>
              <div className="score-level">Level {level}</div>
            </div>

            {canPlay && gameState === "playing" && contractWinnings > 0n && (
              <div className="cash-out-section">
                <button
                  className="btn btn-cash-out btn-large"
                  onClick={handleCashOut}
                >
                  💰 Cash Out
                </button>
                <p className="cash-out-hint">
                  {isDemoMode
                    ? "Playing in demo mode!"
                    : "Secure your winnings or keep climbing!"}
                </p>
              </div>
            )}

            {!canPlay && !isWalletConnected && (
              <div className="wallet-prompt">
                <p className="prompt-text">Connect & start playing!</p>
              </div>
            )}

            {isWalletConnected && !isCorrectChain && (
              <div className="chain-prompt">
                <p className="prompt-text">Select Flow EVM to play!</p>
                <button
                  type="button"
                  onClick={() =>
                    switchChain({ chainId: REQUIRED_CHAIN_ID as any })
                  }
                  className="btn btn-large"
                >
                  Switch to Chain 747
                </button>
              </div>
            )}

            {isDemoMode && (
              <div className="demo-mode-indicator">
                <div className="demo-header">
                  <p className="demo-text">🎮 Demo Mode</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoMode(false);
                      initializeGame();
                    }}
                    className="btn btn-secondary btn-small"
                  >
                    Exit Demo
                  </button>
                </div>
              </div>
            )}

            <div className="stats-section">
              <div className="stat-item">
                <span className="stat-label">Completed Rounds:</span>
                <span className="stat-value">
                  {isDemoMode
                    ? completedRows.size
                    : Number(contractGamesPlayed)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Current Multiplier:</span>
                <span className="stat-value">{getMultiplierDisplay()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Winnings:</span>
                <span className="stat-value">
                  {isDemoMode
                    ? `+${Math.floor(
                        (rows[currentRowIndex]?.multiplier || 1) * 100
                      )}`
                    : `${displayWinnings} FLOW`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {gameState === "lost" && (
        <div className="game-result result-loss">
          <div className="result-title">DEATH TILE!</div>
          <div className="result-score">💀 Game Over</div>
          <div className="result-actions">
            <button className="btn" onClick={initializeGame}>
              Play Again
            </button>
            <span className="result-or">or</span>
            <button className="btn btn-secondary" onClick={initializeGame}>
              New Game
            </button>
          </div>
        </div>
      )}

      {showCashOutModal && (
        <div className="game-result result-cash-out">
          <div className="result-title">CASHED OUT!</div>
          <div className="result-score">💰 {cashedOutAmount} FLOW</div>
          <div className="result-actions">
            <button
              className="btn"
              onClick={() => {
                setShowCashOutModal(false);
                setGameState("playing");
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="app-container">
      <Navbar onConnectClick={() => setIsModalOpen(true)} />

      <main className="main-content">
        <div className="hero-section">
          <TileGame onConnectClick={() => setIsModalOpen(true)} />
        </div>
      </main>

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;
