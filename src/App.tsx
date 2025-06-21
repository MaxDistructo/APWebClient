import { useEffect, useState } from "react";
import { Client, Hint, MessageNode } from "archipelago.js";
import Terminal from "./Terminal";
import { ColorCodes } from "./statics";

const App = () => {
  const [client, setClient] = useState<Client | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [terminalData, setTerminalData] = useState<string>("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [connectButtonText, setConnectButtonText] = useState("Connect");

  useEffect(() => {
    if (!client) {
      setClient(new Client());
    }
  }, []);

  useEffect(() => {
    if (!client) return;

    const handleMessage = (_: string, nodes: MessageNode[]) => {
      console.log("Received message:", nodes);
      const line = nodes
        .map((node) => {
          let color: string | undefined;
          let text: string = node.text ?? "";

          if (node.type === "color" && node.color && node.text) {
            color = node.color.toUpperCase();
          } else if (node.type === "player" && node.player.slot === client.players.self.slot) {
            color = ColorCodes.MAGENTA;
          } else if (node.type === "item" && node.item.useful) {
            color = ColorCodes.SLATEBLUE;
          } else if (node.type === "item" && node.item.progression) {
            color = ColorCodes.PLUM;
          } else if (node.type === "item" && node.item.trap) {
            color = ColorCodes.RED;
          } else if (node.type === "location") {
            color = ColorCodes.GREEN;
          }

          if (color) {
            return text
              .split(" ")
              .map((word) => word ? `#${color}${word}` : "")
              .join(" ");
          }
          return text;
        })
        .join("");
      setTerminalLines((prev) => [...prev, line]);
    };
    const handleHints = (hint: Hint[]) => {
      setHints(hint);
    };

    client.messages.on("message", handleMessage);
    client.items.on("hintsInitialized", handleHints);
    client.items.on("hintFound", (hint: Hint) => {
      setHints((prev) => {
        const idx = prev.findIndex((h) => h.item.id === hint.item.id);
        if (idx !== -1) {
          // Update existing hint
          return prev.map((h) => (h.item.id === hint.item.id ? hint : h));
        } else {
          // Add new hint
          return [...prev, hint];
        }
      });
    });

    return () => {
      client.messages.off("message", handleMessage);
      client.items.off("hintsInitialized", handleHints);
    };
  }, [client]);

  const handleConnectButton = () => {
    if (client && client.socket.connected) {
      client.socket.disconnect();
      setConnectButtonText("Connect");
      setHints([]);
      setTerminalLines([]);
    } else {
      client?.login(
        serverUrl,
        username,
        undefined,
        {
          slotData: false,
          password: password,
        }
      )
        .then(() => {
          setConnectButtonText("Disconnect");
        })
        .catch((error) => {
          setTerminalLines((prev) => [
            ...prev,
            "Failed to connect to Archipelago server: " + error,
          ]);
        });
    }
  };

  return (
    <div>
      {/* Options Menu */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px", width: "100%" }}>
          {(!client || !client.socket.connected) && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label htmlFor="ap-server-url" style={{ minWidth: "110px" }}>Server URL</label>
                <input
                  id="ap-server-url"
                  name="ap-server-url"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  type="text"
                  placeholder="Enter your AP Server URL"
                  onChange={(e) => setServerUrl(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label htmlFor="ap-server-username" style={{ minWidth: "110px" }}>Slot Name</label>
                <input
                  id="ap-server-username"
                  name="ap-server-username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  type="text"
                  placeholder="Username"
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label htmlFor="ap-server-password" style={{ minWidth: "110px" }}>Password</label>
                <input
                  id="ap-server-password"
                  name="ap-server-password"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  type="password"
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px" }}
                />
              </div>
            </>
          )}
          <button
            onClick={handleConnectButton}
            style={{ marginTop: "8px", padding: "8px 0", fontWeight: "bold", cursor: "pointer" }}
          >
            {connectButtonText}
          </button>
        </div>
      </div>
      {client && client.socket.connected && (
        <>
          {/* Terminal */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: "800px",
            margin: "0 auto",
            border: "1px solid #333",
            borderRadius: "8px",
            background: "#2c2f33"
          }}>
            <Terminal lines={terminalLines} />
            {/* Terminal Input */}
            <input
              type="text"
              value={terminalData}
              onChange={(e) => setTerminalData(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  client?.messages.say(terminalData)
                    .then(() => setTerminalData(""))
                    .catch((error) => {
                      setTerminalLines((prev) => [
                        ...prev,
                        "Failed to send message: " + error,
                      ]);
                    });
                }
              }}
              placeholder="Type your message here..."
              style={{
                width: "97.5%",
                padding: "10px",
                border: "1px solid #333",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                background: "#23272e",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>
          {/* Hints */}
            <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingTop: "24px",
            }}
            >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                maxWidth: "800px",
                background: "#23272e",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #333",
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: "flex",
                  background: "#36393f",
                  color: "#fff",
                  fontWeight: "bold",
                  padding: "12px 0",
                  borderBottom: "1px solid #444",
                }}
              >
                <div style={{ flex: 1, textAlign: "center" }}>Sender</div>
                <div style={{ flex: 1, textAlign: "center" }}>Receiver</div>
                <div style={{ flex: 2, textAlign: "center" }}>Item</div>
                <div style={{ flex: 2, textAlign: "center" }}>Location</div>
                <div style={{ flex: 1, textAlign: "center" }}>Status</div>
              </div>
              {/* Table Body */}
              {hints.length === 0 ? (
                <div style={{ color: "#aaa", padding: "24px", textAlign: "center" }}>
                  No hints available.
                </div>
              ) : (
                hints.map((row, idx) => {
                  // Determine color for item name based on item properties
                  const itemColor = row.item.progression
                      ? ColorCodes.PLUM
                      : row.item.useful
                        ? ColorCodes.SLATEBLUE
                        : row.item.trap
                          ? ColorCodes.RED
                          : row.item.filler
                            ? "#888"
                            : undefined;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        background: idx % 2 === 0 ? "#2c2f33" : "#23272e",
                        color: "#fff",
                        padding: "10px 0",
                        borderBottom: idx === hints.length - 1 ? "none" : "1px solid #333",
                      }}
                    >
                      <div style={{ flex: 1, textAlign: "center", color: row.item.sender.alias === username ? "purple" : undefined }}>
                        {row.item.sender.alias}
                      </div>
                      <div style={{ flex: 1, textAlign: "center", color: row.item.receiver.alias === username ? "purple" : undefined }}>
                        {row.item.receiver.alias}
                      </div>
                      <div style={{ flex: 2, textAlign: "center", color: itemColor }}>
                        {row.item.name}
                      </div>
                      <div style={{ flex: 2, textAlign: "center" }}>
                        {row.item.locationGame} - {row.item.locationName}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          textAlign: "center",
                          color: row.found ? ColorCodes.GREEN : undefined,
                        }}
                      >
                        {row.found ? "Found" : "Not Found"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      {(!client || !client.socket.connected) && (
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <p>Disconnected from Archipelago</p>
        </div>
      )}
    </div>
  );
};

export default App;