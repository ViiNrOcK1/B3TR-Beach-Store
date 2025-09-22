import React from 'react';

interface TransactionModalProps {
  txId: string | null;
  status?: string;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ txId, status, onClose }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="text-2xl font-bold mb-4">Transaction Status</h3>
        <p className="text-lg">{status || 'Pending...'}</p>
        {txId && <p className="text-lg mt-4">Transaction ID: {txId}</p>}
        <button
          className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold mt-4"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default TransactionModal;