import React from 'react';

interface TransactionModalProps {
  txId: string | null;
  status?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ txId, status }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="text-2xl font-bold mb-4">Transaction Status</h3>
        <p className="text-lg">{status || 'Pending...'}</p>
        {txId && <p className="text-lg mt-4">Transaction ID: {txId}</p>}
      </div>
    </div>
  );
};

export default TransactionModal;
