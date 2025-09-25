"use client";

import socket from "./socket";
import { JSX, useEffect, useState } from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa";
import { SiSolana, SiDogecoin } from "react-icons/si";

type PriceData = {
  usd: number;
};

type Alert = {
  coin: string;
  price: number;
  message: string;
};

type ActiveAlert = {
  id: string; // Unique ID to track the alert
  coin: string;
  threshold: string;
  type: string;
  triggered: boolean;
};

export default function Dashboard() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [alertsHistory, setAlertsHistory] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [newAlert, setNewAlert] = useState({
    coin: "",
    threshold: "",
    type: "PRICE_ABOVE",
  });

  const coinIcons: Record<string, JSX.Element> = {
    bitcoin: <FaBitcoin size={24} />,
    ethereum: <FaEthereum size={24} />,
    solana: <SiSolana size={24} />,
    dogecoin: <SiDogecoin size={24} />,
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Frontend connected:", socket.id);
    });

    socket.on("price_update", (newPrices) => {
      setPrevPrices(prices);
      setPrices(newPrices);
    });

    socket.on("alert_triggered", (data: Alert) => {
      // Add to history
      setAlertsHistory((prev) => [data, ...prev]);

      // Remove from active alerts (since backend disables it)
      setActiveAlerts((prev) =>
        prev.filter(
          (alert) =>
            !(
              alert.coin === data.coin &&
              parseFloat(alert.threshold) === data.price
            )
        )
      );
    });

    socket.on("load_alerts", (loadedAlerts: ActiveAlert[]) => {
      console.log("Loaded active alerts from server:", loadedAlerts);
      setActiveAlerts(loadedAlerts);
    });

    return () => {
      socket.off("price_update");
      socket.off("alert_triggered");
      socket.off("load_alerts");
    };
  }, [prices]);

  const handleSetAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.coin || !newAlert.threshold) return;
    socket.emit("set_alert", newAlert);
    setNewAlert({ coin: "", threshold: "", type: "PRICE_ABOVE" });
  };

  const formatPrice = (price: number | undefined) =>
    price ? price.toLocaleString() : "-";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-blue-400">Crypto Dashboard</h1>
        <p className="text-gray-400 font-medium">Real-Time Prices & Alerts</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Prices + Set Alert */}
        <div className="flex-1">
          {/* Price Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {Object.entries(prices).map(([coin, info]) => {
              const prevPrice = prevPrices[coin];
              const priceChanged = prevPrice !== info.usd;
              const alertTriggered = alertsHistory.some(
                (a) => a.coin === coin && a.price === info.usd
              );

              return (
                <div
                  key={coin}
                  className={`relative bg-gray-800 p-6 rounded-xl shadow-lg transition-all duration-500 ${
                    priceChanged ? "border-2 border-blue-400 scale-105" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {coinIcons[coin]}
                      <h2 className="text-xl font-semibold capitalize">
                        {coin}
                      </h2>
                    </div>
                    {alertTriggered && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        ALERT
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-3xl font-bold ${
                      priceChanged ? "text-green-400" : "text-gray-200"
                    }`}
                  >
                    ${formatPrice(info.usd)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Set Alert Form */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-blue-400">
              Set a New Alert
            </h2>
            <form onSubmit={handleSetAlert} className="space-y-4">
              {/* Coin */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Coin
                </label>
                <select
                  value={newAlert.coin}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, coin: e.target.value })
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200"
                  required
                >
                  <option value="" disabled>
                    Select a coin
                  </option>
                  <option value="bitcoin">Bitcoin</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="solana">Solana</option>
                  <option value="dogecoin">Dogecoin</option>
                </select>
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Threshold USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAlert.threshold}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, threshold: e.target.value })
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200"
                  placeholder="e.g., 50000"
                  required
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Condition
                </label>
                <select
                  value={newAlert.type}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, type: e.target.value })
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200"
                >
                  <option value="PRICE_ABOVE">Price Rises Above</option>
                  <option value="PRICE_BELOW">Price Falls Below</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-colors duration-300"
              >
                Set Alert
              </button>
            </form>
          </div>
        </div>

        {/* Right: Active Alerts + History */}
        <div className="w-full lg:w-1/3 flex flex-col gap-8 h-[calc(100vh-5rem)]">
          {/* Active Alerts */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-1/2">
            <h2 className="text-xl font-bold mb-4 text-blue-400">
              Active Alerts
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {activeAlerts.length === 0 ? (
                <p className="text-gray-400">No alerts are set yet.</p>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg transition-colors duration-300 ${
                      alert.triggered
                        ? "bg-green-700 border-l-4 border-green-400"
                        : "bg-gray-700 border-l-4 border-gray-500"
                    }`}
                  >
                    <p className="font-semibold capitalize">{alert.coin}</p>
                    <p className="text-sm text-gray-300">
                      {alert.type === "PRICE_ABOVE" ? "Above" : "Below"}: $
                      {alert.threshold}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Triggered History */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-1/2">
            <h2 className="text-xl font-bold mb-4 text-red-400">
              Triggered History
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {alertsHistory.length === 0 ? (
                <p className="text-gray-400">No alerts triggered yet.</p>
              ) : (
                alertsHistory.map((a, i) => (
                  <div
                    key={i}
                    className="p-4 bg-red-800 rounded-lg shadow-md border-l-4 border-red-500"
                  >
                    <p className="font-medium">{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
