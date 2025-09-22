import React, { useEffect, useState } from 'react';

interface Purchase {
  item: string;
  amount: number;
  account: string;
  txId: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  userAddress: string;
}

function Transactions({ setShowTransactions }: { setShowTransactions: (show: boolean) => void }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    const storedPurchases = localStorage.getItem('b3tr_purchases');
    if (storedPurchases) {
      setPurchases(JSON.parse(storedPurchases));
    }
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow mx-auto max-w-4xl mt-6">
      <h3 className="text-xl font-bold mb-4">Purchase Transactions</h3>
      <table className="w-full table-auto">
        <thead>
          <tr>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Amount (B3TR)</th>
            <th className="px-4 py-2">Wallet Address</th>
            <th className="px-4 py-2">Tx ID</th>
            <th className="px-4 py-2">Timestamp</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Address</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase, index) => (
            <tr key={index}>
              <td className="border px-4 py-2">{purchase.item}</td>
              <td className="border px-4 py-2">{purchase.amount}</td>
              <td className="border px-4 py-2">{purchase.account}</td>
              <td className="border px-4 py-2">{purchase.txId}</td>
              <td className="border px-4 py-2">{purchase.timestamp}</td>
              <td className="border px-4 py-2">{purchase.userName}</td>
              <td className="border px-4 py-2">{purchase.userEmail}</td>
              <td className="border px-4 py-2">{purchase.userAddress}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold mt-4"
        onClick={() => setShowTransactions(false)}
      >
        Close
      </button>
    </div>
  );
}

export default Transactions;