"use client";

import io from "socket.io-client";
import { JSX, useEffect, useState } from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa";
import { SiSolana, SiDogecoin } from "react-icons/si";

const socket = io("http://localhost:4000");

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
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
    // Correctly updates prevPrices using a function to get the latest `prices` state.
    socket.on("price_update", (newPrices) => {
      setPrevPrices(prices);
      setPrices(newPrices);
    });

    socket.on("alert_triggered", (data: Alert) => {
      setAlerts((prev) => [data, ...prev]);
      setActiveAlerts((prev) =>
        prev.map((alert) =>
          // Use parseFloat to compare the string threshold with the number price.
          // This ensures the comparison is correct.
          alert.coin === data.coin && parseFloat(alert.threshold) === data.price
            ? { ...alert, triggered: true }
            : alert
        )
      );
    });

    return () => {
      socket.off("price_update");
      socket.off("alert_triggered");
    };
  }, [prices]);

  const handleSetAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.coin || !newAlert.threshold) return;

    const newId = Date.now().toString();
    const alertToAdd = { ...newAlert, id: newId, triggered: false };
    setActiveAlerts((prev) => [...prev, alertToAdd]);

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
        {/* Main Content (Prices and Set Alert Form) */}
        <div className="flex-1">
          {/* Price Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {Object.entries(prices).map(([coin, info]) => {
              const prevPrice = prevPrices[coin];
              const priceChanged = prevPrice !== info.usd;
              const alertTriggered = alerts.some(
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
            <h2 className="text-xl font-bold mb-4">Set a New Alert</h2>
            <form onSubmit={handleSetAlert} className="space-y-4">
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

        {/* Right Side: Active Alerts Box */}
        <div className="w-full lg:w-1/3">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Active Alerts</h2>
            {activeAlerts.length === 0 ? (
              <p className="text-gray-400">No alerts are set yet.</p>
            ) : (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
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
                    {alert.triggered && (
                      <p className="text-sm text-green-200 mt-1">
                        Alert Triggered!
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Triggered Alerts History */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Triggered History</h2>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-gray-400">No alerts triggered yet.</p>
              ) : (
                alerts.map((a, i) => (
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