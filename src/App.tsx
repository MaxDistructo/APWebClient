import { useState, useEffect } from "react";
import { Client, Hint, MessageNode } from "archipelago.js";
import Terminal from "./Terminal";
import { ColorCodes } from "./statics";

interface Tab {
  id: number;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  terminalLines: string[];
  hints: Hint[];
  client: Client | null;
  connectButtonText: string;
  terminalData: string;
}

const LOCAL_STORAGE_KEY = "archipelago_tabs";

const App = () => {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure client is null on load
        return parsed.map((tab: any) => ({ ...tab, client: null }));
      } catch {
        return [
          {
            id: 1,
            name: "Tab 1",
            serverUrl: "",
            username: "",
            password: "",
            terminalLines: [],
            hints: [],
            client: null,
            connectButtonText: "Connect",
            terminalData: "",
          },
        ];
      }
    }
    return [
      {
        id: 1,
        name: "Tab 1",
        serverUrl: "",
        username: "",
        password: "",
        terminalLines: [],
        hints: [],
        client: null,
        connectButtonText: "Connect",
        terminalData: "",
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<number>(1);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleTabChange = (id: number) => {
    setActiveTabId(id);
  };

  const handleAddTab = () => {
    const newTab: Tab = {
      id: tabs.length + 1,
      name: `Tab ${tabs.length + 1}`,
      serverUrl: "",
      username: "",
      password: "",
      terminalLines: [],
      hints: [],
      client: null,
      connectButtonText: "Connect",
      terminalData: "",
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleRemoveTab = (id: number) => {
    setTabs((prev) => prev.filter((tab) => tab.id !== id));
    if (activeTabId === id && tabs.length > 1) {
      setActiveTabId(tabs[0].id);
    }
  };

  const handleRenameTab = (id: number, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    );
  };

  const handleConnectButton = (id: number) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === id) {
          // Disconnect if already connected
          if (tab.client && tab.client.socket.connected) {
            tab.client.socket.disconnect();
            return {
              ...tab,
              connectButtonText: "Connect",
              hints: [],
              terminalLines: [],
            };
          }

          // If client exists but is disconnected, reconnect
          if (tab.client && !tab.client.socket.connected) {
            tab.client
              .login(tab.serverUrl, tab.username, undefined, {
                slotData: false,
                password: tab.password,
              })
              .then(() => {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === id
                      ? { ...t, connectButtonText: "Disconnect" }
                      : t
                  )
                );
              })
              .catch((error) => {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === id
                      ? {
                          ...t,
                          terminalLines: [
                            ...t.terminalLines,
                            "Failed to connect: " + error,
                          ],
                        }
                      : t
                  )
                );
              });
            return tab;
          }

          // Otherwise, create a new client and attach listeners
          const client = new Client();
          if (!(client as any)._listenersAdded) {
            (client as any)._listenersAdded = true;
            client.messages.on(
              "message",
              (_message: string, nodes: MessageNode[]) => {
                const line = nodes
                  .map((node) => {
                    let color;
                    let text = node.text ?? "";

                    if (node.type === "color" && node.color && node.text) {
                      color = node.color.toUpperCase();
                    } else if (
                      node.type === "player" &&
                      node.player.slot === client.players.self.slot
                    ) {
                      color = ColorCodes.MAGENTA;
                    } else if (node.type === "player") {
                      color = ColorCodes.YELLOW;
                    } else if (node.type === "item" && node.item.useful) {
                      color = ColorCodes.SLATEBLUE;
                    } else if (node.type === "item" && node.item.progression) {
                      color = ColorCodes.PLUM;
                    } else if (node.type === "item" && node.item.trap) {
                      color = ColorCodes.RED;
                    } else if (node.type === "item") {
                      color = ColorCodes.CYAN;
                    } else if (node.type === "location") {
                      color = ColorCodes.GREEN;
                    }

                    if (color) {
                      return text
                        .split(" ")
                        .map((word) => (word ? `#${color}${word}` : ""))
                        .join(" ");
                    }
                    return text;
                  })
                  .join("");
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === id
                      ? { ...t, terminalLines: [...t.terminalLines, line] }
                      : t
                  )
                );
              }
            );

            client.items.on("hintsInitialized", (hints: Hint[]) => {
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === id ? { ...t, hints } : t
                )
              );
            });
          }
          client
            .login(tab.serverUrl, tab.username, undefined, {
              slotData: false,
              password: tab.password,
            })
            .then(() => {
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === id
                    ? { ...t, client, connectButtonText: "Disconnect" }
                    : t
                )
              );
            })
            .catch((error) => {
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        terminalLines: [
                          ...t.terminalLines,
                          "Failed to connect: " + error,
                        ],
                      }
                    : t
                )
              );
            });
          return { ...tab, client };
        }
        return tab;
      })
    );
  };

  // Save tabs to localStorage whenever they change (excluding client)
  useEffect(() => {
    const tabsToSave = tabs.map(({ client, ...rest }) => rest);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tabsToSave));
  }, [tabs]);

  // Auto-reconnect tabs with connection info but no client
  useEffect(() => {
    tabs.forEach((tab) => {
      if (
        !tab.client &&
        tab.serverUrl &&
        tab.username &&
        tab.password &&
        tab.connectButtonText === "Connect"
      ) {
        handleConnectButton(tab.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "8px", padding: "8px", overflowX: "auto" }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "8px 16px",
              cursor: "pointer",
              background: tab.id === activeTabId ? "#444" : "#222",
              color: "#fff",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          >
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleRenameTab(tab.id, e.target.textContent || tab.name)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                outline: "none",
                fontSize: "1rem",
                textAlign: "center",
                cursor: "text",
              }}
            >
              {tab.name}
            </span>
          </div>
        ))}
        <button
          onClick={handleAddTab}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            background: "#444",
            color: "#fff",
            borderRadius: "4px",
            border: "none",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>

      {activeTab && (
        <div>
          {/* Connection Settings */}
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Tab Name Input */}
              <input
                type="text"
                placeholder="Tab Name"
                value={activeTab.name}
                onChange={(e) =>
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeTabId
                        ? { ...tab, name: e.target.value }
                        : tab
                    )
                  )
                }
                style={{
                  padding: "10px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  background: "#23272e",
                  color: "#fff",
                  fontSize: "1rem",
                  outline: "none",
                  marginBottom: "8px",
                }}
              />
              <input
                type="text"
                placeholder="Server URL"
                value={activeTab.serverUrl}
                onChange={(e) =>
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeTabId
                        ? { ...tab, serverUrl: e.target.value }
                        : tab
                    )
                  )
                }
                style={{
                  padding: "10px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  background: "#23272e",
                  color: "#fff",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
              <input
                type="text"
                placeholder="Username"
                value={activeTab.username}
                onChange={(e) =>
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeTabId
                        ? { ...tab, username: e.target.value }
                        : tab
                    )
                  )
                }
                style={{
                  padding: "10px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  background: "#23272e",
                  color: "#fff",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={activeTab.password}
                onChange={(e) =>
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeTabId
                        ? { ...tab, password: e.target.value }
                        : tab
                    )
                  )
                }
                style={{
                  padding: "10px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  background: "#23272e",
                  color: "#fff",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleConnectButton(activeTabId)}
                style={{
                  padding: "10px",
                  border: "none",
                  borderRadius: "4px",
                  background: "#7289da",
                  color: "#fff",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {activeTab.connectButtonText}
              </button>
            </div>
          </div>

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
            background: "#2c2f33",
            overflow: "hidden",
          }}>
            <Terminal lines={activeTab.terminalLines} />
            {/* Terminal Input */}
            <input
              type="text"
              value={activeTab.terminalData}
              onChange={(e) =>
                setTabs((prev) =>
                  prev.map((tab) =>
                    tab.id === activeTabId
                      ? { ...tab, terminalData: e.target.value }
                      : tab
                  )
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  activeTab.client?.messages
                    .say(activeTab.terminalData)
                    .then(() => {
                      setTabs((prev) =>
                        prev.map((tab) =>
                          tab.id === activeTabId
                            ? { ...tab, terminalData: "" }
                            : tab
                        )
                      );
                    });
              }}}
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
              {activeTab.hints.length === 0 ? (
                <div style={{ color: "#aaa", padding: "24px", textAlign: "center" }}>
                  No hints available.
                </div>
              ) : (
                activeTab.hints.map((row, idx) => {
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
                        borderBottom: idx === activeTab.hints.length - 1 ? "none" : "1px solid #333",
                      }}
                    >
                      <div style={{ flex: 1, textAlign: "center", color: row.item.sender.alias === activeTab.username ? "purple" : undefined }}>
                        {row.item.sender.alias}
                      </div>
                      <div style={{ flex: 1, textAlign: "center", color: row.item.receiver.alias === activeTab.username ? "purple" : undefined }}>
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

          {/* Delete Tab Button */}
          <button
            onClick={() => handleRemoveTab(activeTabId)}
            style={{
              marginTop: "16px",
              padding: "10px",
              border: "none",
              borderRadius: "4px",
              background: "#ff4d4d",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Delete Tab
          </button>
        </div>
      )}
    </div>
  );
};

export default App;