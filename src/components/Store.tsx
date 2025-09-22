import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WalletButton, useWallet, useThor, useWalletModal } from '@vechain/dapp-kit-react';
import { Clause, Units, Address, ABIItem, ABIFunction, FixedPointNumber } from '@vechain/sdk-core';
import TransactionModal from './TransactionModal';
import { RECIPIENT_ADDRESS } from '../config';

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
  };
}

interface Product {
  id: number;
  name: string;
  priceUSD: number;
  priceB3TR: number;
  description: string;
}

interface StoreProps {
  showManageForm: boolean;
  setShowManageForm: (show: boolean) => void;
}

interface TransactionReceipt {
  reverted: boolean;
}

function Store({ showManageForm, setShowManageForm }: StoreProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [formProduct, setFormProduct] = useState({
    name: '',
    priceUSD: 0,
    priceB3TR: 0,
    description: ''
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { account, signer } = useWallet();
  const thor = useThor();
  const { open } = useWalletModal();

  const b3trContractAddress = '0x7c255e1a8da128f7b2770875d32cc82e4f4e6d54';
  const b3trDecimals = 18;

  // Fetch B3TR balance
  const { data: balanceData } = useQuery({
    queryKey: ['b3trBalance', account],
    queryFn: async () => {
      if (!account || !thor) return null;
      const result = await thor.contracts.executeCall(
        b3trContractAddress,
        ABIItem.ofSignature(ABIFunction, 'function balanceOf(address owner) view returns (uint256)'),
        [account]
      );
      // @ts-ignore: Workaround for missing decoded property in type definition
      const balance = FixedPointNumber.from(result.decoded[0] as string);
      console.log('B3TR Balance:', Units.formatUnits(balance, b3trDecimals));
      return Units.formatUnits(balance, b3trDecimals);
    },
    enabled: !!account && !!thor,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Track transaction status
  const { data: receipt } = useQuery<TransactionReceipt | null>({
    queryKey: ['transaction', txId],
    queryFn: async () => {
      if (!txId || !thor) return null;
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      console.log('Transaction receipt:', receipt);
      return receipt;
    },
    refetchInterval: 7000,
    placeholderData: (previousData) => previousData,
    enabled: !!txId && !!thor
  });

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem('b3tr_products');
      console.log('Stored products:', storedProducts);
      let parsedProducts: Product[] = [];
      if (storedProducts) {
        parsedProducts = JSON.parse(storedProducts);
      }
      if (!parsedProducts || parsedProducts.length === 0) {
        const defaultProducts: Product[] = [
          { id: 1, name: 'B3TR BEACH T-Shirt', priceUSD: 25, priceB3TR: 250, description: 'Eco-friendly cotton T-shirt with B3TR logo.' },
          { id: 2, name: 'B3TR BEACH Towel', priceUSD: 20, priceB3TR: 200, description: 'Reusable B3TR Towel.' },
          { id: 3, name: 'B3TR BEACH Cap', priceUSD: 20, priceB3TR: 200, description: 'Sustainable fabric cap with embroidered logo.' },
          { id: 4, name: 'B3TR BEACH Bucket', priceUSD: 15, priceB3TR: 150, description: 'Recycled Polypropylene Bucket with logo.' },
          { id: 5, name: 'B3TR BEACH Hoodie', priceUSD: 20, priceB3TR: 200, description: 'Cotton hoodie with embroidered logo.' },
          { id: 6, name: 'B3TR BEACH Bag', priceUSD: 20, priceB3TR: 200, description: 'Sustainable bag with embroidered logo.' }
        ];
        localStorage.setItem('b3tr_products', JSON.stringify(defaultProducts));
        parsedProducts = defaultProducts;
      }
      setProducts(parsedProducts);
      console.log('Loaded products:', parsedProducts);
    } catch (err: any) {
      setError('Failed to load products: ' + err.message);
      console.error('Error loading products:', err);
    }
    // Fade-in animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-content').forEach((element) => {
      observer.observe(element);
    });
    return () => {
      console.log('Cleaning up useEffect');
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (receipt && selectedProduct && txId && account) {
      const status = !receipt ? 'pending' : receipt.reverted ? 'reverted' : 'success';
      if (status === 'success') {
        setPaymentStatus(`Payment successful for ${selectedProduct.name}! Transaction ID: ${txId}`);
        const purchases = JSON.parse(localStorage.getItem('b3tr_purchases') || '[]');
        purchases.push({
          item: selectedProduct.name,
          amount: selectedProduct.priceB3TR,
          account,
          txId,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('b3tr_purchases', JSON.stringify(purchases));
        console.log('Purchase recorded:', purchases);
      } else if (status === 'reverted') {
        setPaymentStatus('Payment failed: Transaction reverted.');
        console.error('Transaction reverted:', txId);
      }
    }
  }, [receipt, selectedProduct, txId, account]);

  const handlePurchase = async (product: Product) => {
    console.log('Buy Now clicked for:', product, { account });
    setSelectedProduct(product);
    setPaymentStatus('');
    if (!account) {
      open();
      return;
    }
  };

  const handleB3TRPayment = async () => {
    console.log('Confirm purchase clicked', { account, thor, signer, selectedProduct });
    if (!account || !thor || !signer || !selectedProduct) {
      setPaymentStatus('Must be connected to VeChain mainnet with a selected product.');
      console.error('Missing requirements:', { account, thor, signer, selectedProduct });
      return;
    }
    try {
      const merchantAddress = Address.of(RECIPIENT_ADDRESS);
      const amountWei = Units.parseUnits(selectedProduct.priceB3TR.toString(), b3trDecimals).toString();
      const clauses = [
        Clause.callFunction(
          Address.of(b3trContractAddress),
          ABIItem.ofSignature(ABIFunction, 'function transfer(address to, uint256 amount) returns (bool)'),
          [merchantAddress.toString(), amountWei]
        )
      ];
      const txId = await signer.signTransaction({
        clauses,
        gas: 150000,
        comment: `Purchase ${selectedProduct.name} for ${selectedProduct.priceB3TR} B3TR`
      });
      console.log('Transaction signed result:', txId);
      if (!txId) {
        throw new Error('No transaction ID returned');
      }
      setTxId(txId);
      console.log('Transaction sent:', txId);
      setPaymentStatus(`Transaction sent: ${txId}. Awaiting confirmation...`);
    } catch (error: any) {
      let errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('method not supported')) {
        errorMessage = 'VeWorld does not support the requested transaction method. Please ensure VeWorld is updated or contact support@veworld.net.';
      } else if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user.';
      } else if (errorMessage.includes('node') || errorMessage.includes('CORS')) {
        errorMessage = 'Unable to connect to VeChain node. Check network connection or try a different node URL.';
      }
      setPaymentStatus(`Error: ${errorMessage}. Ensure sufficient B3TR and VTHO.`);
      console.error('Payment failed:', error);
    }
  };

  const closeModal = () => {
    console.log('Closing modal');
    setSelectedProduct(null);
    setPaymentStatus('');
    setTxId(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formProduct);
    if (!formProduct.name || !formProduct.priceUSD || !formProduct.priceB3TR || !formProduct.description) {
      alert('Please fill in all product fields.');
      return;
    }
    const updatedProduct: Product = {
      id: editIndex !== null ? products[editIndex].id : products.length + 1,
      name: formProduct.name,
      priceUSD: Number(formProduct.priceUSD),
      priceB3TR: Number(formProduct.priceB3TR),
      description: formProduct.description
    };
    const updatedProducts = editIndex !== null
      ? products.map((p, i) => (i === editIndex ? updatedProduct : p))
      : [...products, updatedProduct];
    localStorage.setItem('b3tr_products', JSON.stringify(updatedProducts));
    setProducts(updatedProducts);
    setFormProduct({ name: '', priceUSD: 0, priceB3TR: 0, description: '' });
    setEditIndex(null);
    setShowManageForm(false);
    console.log('Products updated:', updatedProducts);
  };

  const handleEditProduct = (index: number) => {
    console.log('Edit product:', index, products[index]);
    const product = products[index];
    setFormProduct({
      name: product.name,
      priceUSD: product.priceUSD,
      priceB3TR: product.priceB3TR,
      description: product.description
    });
    setEditIndex(index);
    setShowManageForm(true);
  };

  const handleDeleteProduct = (index: number) => {
    console.log('Delete product:', index, products[index]);
    if (window.confirm(`Are you sure you want to delete the product "${products[index].name}"?`)) {
      const updatedProducts = products.filter((_, i) => i !== index);
      localStorage.setItem('b3tr_products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      console.log(`Deleted product ${products[index].name}`);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <section id="store" className="bg-gray-100 py-16 wave-top wave-bottom">
      <div className="container mx-auto px-4 text-center">
        <div className="fade-content">
          <h2 className="text-4xl font-bold text-amber-400">
            <span className="text-custom-blue text-outline-amber">B3TR</span> <span className="text-amber-400">BEACH Store</span>
          </h2>
          <p className="text-lg mb-6">
            Shop for eco-friendly merchandise and pay with <span className="text-custom-blue text-outline-amber">B3TR</span> tokens!
          </p>
          <p className="text-lg mb-4">
            Wallet Status: {account ? (
              <span className="text-green-500">Connected (Network: mainnet)</span>
            ) : (
              <span className="text-red-500">Not Connected</span>
            )}
          </p>
          {!account && <WalletButton />}
          {balanceData && (
            <p className="text-lg mb-4">
              B3TR Balance: {balanceData} <span className="text-custom-blue text-outline-amber">B3TR</span>
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <p>No products available.</p>
            ) : (
              products.map((product: Product) => (
                <div key={product.id} className="bg-custom-blue p-4 rounded-lg shadow text-center">
                  <p className="text-2xl font-bold text-white">
                    {product.name.replace('BEACH', <span className="text-amber-400">BEACH</span> as any)}
                  </p>
                  <p className="text-lg text-white">
                    {product.priceB3TR} <span className="text-custom-blue text-outline-amber">B3TR</span>
                  </p>
                  <p className="text-lg text-white">{product.description}</p>
                  <button
                    className="buy-now text-2xl font-bold px-2 py-1 rounded-lg mt-4"
                    onClick={() => handlePurchase(product)}
                  >
                    Buy Now
                  </button>
                </div>
              ))
            )}
          </div>
          {showManageForm && (
            <div className="bg-white p-4 rounded-lg shadow mx-auto max-w-2xl mt-6">
              <form onSubmit={handleFormSubmit}>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Product Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={formProduct.name}
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-lg"
                    value={formProduct.priceUSD}
                    onChange={(e) => setFormProduct({ ...formProduct, priceUSD: Number(e.target.value) })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Price (B3TR)</label>
                  <input
                    type="number"
                    step="1"
                    className="w-full p-2 border rounded-lg"
                    value={formProduct.priceB3TR}
                    onChange={(e) => setFormProduct({ ...formProduct, priceB3TR: Number(e.target.value) })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Description</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={formProduct.description}
                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-400 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white"
                >
                  {editIndex !== null ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold ml-4"
                  onClick={() => setShowManageForm(false)}
                >
                  Cancel
                </button>
              </form>
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4">Current Products</h3>
                {products.map((product: Product, index: number) => (
                  <div key={product.id} className="flex justify-between items-center mb-2">
                    <span>{`${product.name} ($${product.priceUSD}, ${product.priceB3TR} B3TR)`}</span>
                    <div>
                      <button
                        className="bg-blue-600 text-white px-2 py-1 rounded-lg mr-2"
                        onClick={() => handleEditProduct(index)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteProduct(index)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-center mt-6">
            <a href="/index.html" className="back-link">Back to Main Page</a>
          </div>
        </div>
        {selectedProduct && (
          <div className="modal">
            <div className="modal-content">
              <h3 className="text-2xl font-bold mb-4">Confirm Purchase: {selectedProduct.name}</h3>
              <p className="text-lg mb-4">Price: {selectedProduct.priceB3TR} B3TR</p>
              {account && (
                <button
                  className="bg-amber-400 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white"
                  onClick={handleB3TRPayment}
                >
                  Yes
                </button>
              )}
              {paymentStatus && <p className="text-lg mt-4">{paymentStatus}</p>}
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold mt-4"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {txId && <TransactionModal txId={txId} status={receipt ? (receipt.reverted ? 'reverted' : 'success') : 'pending'} />}
      </div>
    </section>
  );
}

export default Store;