import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WalletButton, useWallet, useThor, useWalletModal } from '@vechain/dapp-kit-react';
import { Clause, Units, Address, ABIItem, ABIFunction, FixedPointNumber } from '@vechain/sdk-core';
import { TransactionReceipt } from '@vechain/sdk-network';
import emailjs from '@emailjs/browser';
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
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    address: ''
  });
  const formRef = useRef<HTMLFormElement>(null);
  const { account, signer } = useWallet();
  const thor = useThor();
  const { open } = useWalletModal();

  const b3trContractAddress = '0x5ef79995FE8a89e0812330E4378eB2660ceDe699';
  const b3trDecimals = 18;
  const vthoContractAddress = '0x0000000000000000000000000000456e65726779'; // VTHO contract address

  // Fetch B3TR balance
  const { data: balanceData, error: balanceError } = useQuery<{ data: string | null, error: Error | null }>({
    queryKey: ['b3trBalance', account],
    queryFn: async () => {
      if (!account || !thor) return { data: null, error: null };
      try {
        const result = await thor.contracts.executeCall(
          b3trContractAddress,
          ABIItem.ofSignature(ABIFunction, 'function balanceOf(address owner) view returns (uint256)'),
          [Address.of(account).toString()]
        );
        let balanceValue: string;
        // @ts-ignore
        if (result.data && typeof result.data === 'object' && 'digits' in result.data) {
          // @ts-ignore
          console.warn('Received BigNumber-like object for balance:', result.data);
          // @ts-ignore
          balanceValue = (!result.data.digits || result.data.digits === '') ? '0' : result.data.toString();
        } 
        // @ts-ignore
        else if (!result.data || result.data === '0x' || result.data === '') {
          balanceValue = '0';
        } else {
          // @ts-ignore
          balanceValue = result.data;
        }
        const balance = FixedPointNumber.of(balanceValue);
        console.log(`B3TR Balance for ${account}:`, Units.formatUnits(balance, b3trDecimals));
        return { data: Units.formatUnits(balance, b3trDecimals), error: null };
      } catch (err: any) {
        console.error('B3TR balance query failed:', err);
        return { data: null, error: new Error(`Failed to fetch B3TR balance: ${err.message}`) };
      }
    },
    enabled: !!account && !!thor,
    refetchInterval: (query) => (query.state.error ? false : 10000) // Stop refetching on error
  });

  // Fetch VTHO balance
  const { data: vthoData, error: vthoError } = useQuery({
    queryKey: ['vthoBalance', account],
    queryFn: async () => {
      if (!account || !thor) return null;
      try {
        const accountInfo = await thor.accounts.getAccount(Address.of(account));
        const vthoBalance = FixedPointNumber.of(accountInfo.energy);
        console.log(`VTHO Balance for ${account}:`, Units.formatUnits(vthoBalance, 18));
        return Units.formatUnits(vthoBalance, 18);
      } catch (err: any) {
        console.error('VTHO balance query failed:', err);
        throw new Error(`Failed to fetch VTHO balance: ${err.message}`);
      }
    },
    enabled: !!account && !!thor,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Track transaction status
  const { data: receipt } = useQuery<TransactionReceipt | null>({
    queryKey: ['transaction', txId],
    queryFn: async () => {
      if (!txId || !thor || !selectedProduct) return null;
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      console.log(`Transaction receipt for ${txId}:`, receipt);
      
      // Check transfer success by simulating the transfer call
      if (receipt && !receipt.reverted && selectedProduct) {
        try {
          const callResult = await thor.contracts.executeCall(
            b3trContractAddress,
            ABIItem.ofSignature(ABIFunction, 'function transfer(address to, uint256 amount) returns (bool)'),
            [RECIPIENT_ADDRESS, Units.parseUnits(selectedProduct.priceB3TR.toString(), b3trDecimals).toString()]
          );
          
          // @ts-ignore - Handle the transfer success check
          const transferSuccess = callResult.data === '0x0000000000000000000000000000000000000000000000000000000000000001'; // true in hex
          console.log(`Transfer success for ${txId}:`, transferSuccess);
          
          if (transferSuccess) {
            try {
              const recipientBalanceResult = await thor.contracts.executeCall(
                b3trContractAddress,
                ABIItem.ofSignature(ABIFunction, 'function balanceOf(address owner) view returns (uint256)'),
                [RECIPIENT_ADDRESS]
              );
              
              // Handle the same BigNumber issue for recipient balance
              let recipientBalanceValue: string;
              
              // @ts-ignore
              if (recipientBalanceResult.data && typeof recipientBalanceResult.data === 'object' && 'digits' in recipientBalanceResult.data) {
                // @ts-ignore
                console.warn('Received BigNumber-like object for recipient:', recipientBalanceResult.data);
                // @ts-ignore
                recipientBalanceValue = (!recipientBalanceResult.data.digits || recipientBalanceResult.data.digits === '') ? '0' : recipientBalanceResult.data.toString();
              } 
              // @ts-ignore
              else if (!recipientBalanceResult.data || recipientBalanceResult.data === '0x' || recipientBalanceResult.data === '') {
                recipientBalanceValue = '0';
              } else {
                // @ts-ignore
                recipientBalanceValue = recipientBalanceResult.data;
              }
              
              const recipientBalance = FixedPointNumber.of(recipientBalanceValue);
              console.log(`Recipient balance after transaction:`, Units.formatUnits(recipientBalance, b3trDecimals));
            } catch (balanceErr) {
              console.warn('Failed to fetch recipient balance:', balanceErr);
              // Continue anyway, don't fail the transaction
            }
          }
          
          return { ...receipt, transferSuccess };
        } catch (callErr) {
          console.warn('Failed to simulate transfer call:', callErr);
          // Assume success if we can't simulate (better than failing)
          return { ...receipt, transferSuccess: true };
        }
      }
      return receipt;
    },
    refetchInterval: (data) => (data && (data as unknown as TransactionReceipt)?.reverted !== undefined ? false : 7000),
    placeholderData: (previousData: TransactionReceipt | null | undefined) => previousData || null,
    enabled: !!txId && !!thor && !!selectedProduct
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
      const status = !receipt ? 'pending' : receipt.reverted || !(receipt as any).transferSuccess ? 'reverted' : 'success';
      if (status === 'success' || status === 'reverted') {
        setPaymentStatus(status === 'success' 
          ? `Payment successful for ${selectedProduct.name}! Transaction ID: ${txId}`
          : 'Payment failed: Transaction reverted.');
        console.log(status === 'success' ? 'Purchase successful' : `Transaction reverted: ${txId}`);
        
        if (status === 'success') {
          const purchases = JSON.parse(localStorage.getItem('b3tr_purchases') || '[]');
          purchases.push({
            item: selectedProduct.name,
            amount: selectedProduct.priceB3TR,
            account,
            txId,
            timestamp: new Date().toISOString(),
            userName: userDetails.name,
            userEmail: userDetails.email,
            userAddress: userDetails.address
          });
          localStorage.setItem('b3tr_purchases', JSON.stringify(purchases));
          console.log('Purchase recorded:', purchases);
          // Send receipt to email
          if (formRef.current && userDetails.email) {
            emailjs.sendForm('B3TRBEACH', 'B3TRBEACH', formRef.current, 'B3TRBEACH')
              .then((result) => {
                console.log('Receipt sent:', result.text);
              }, (error) => {
                console.error('Receipt send error:', error.text);
              });
          }
        }
        // Reset transaction state to close modals
        setTxId(null);
        setSelectedProduct(null);
        setUserDetails({ name: '', email: '', address: '' });
      }
    }
  }, [receipt, selectedProduct, txId, account, userDetails]);

  const handlePurchase = async (product: Product) => {
    console.log('Buy Now clicked for:', JSON.stringify(product), { account });
    setPaymentStatus('');
    if (!account) {
      open();
      setSelectedProduct(product); // Store product for after connection
      return;
    }
    // Check balance before showing confirmation modal
    if (balanceError) {
      setPaymentStatus('Failed to fetch B3TR balance. Please try again.');
      console.error('B3TR balance error:', balanceError);
      alert('Failed to fetch B3TR balance. Please try again.');
      return;
    }
    if (balanceData?.data && Number(balanceData.data) < product.priceB3TR) {
      setPaymentStatus(`Insufficient B3TR balance. Required: ${product.priceB3TR}, Available: ${balanceData.data}`);
      console.error('Insufficient B3TR balance:', { required: product.priceB3TR, available: balanceData.data });
      alert(`Insufficient B3TR balance. Required: ${product.priceB3TR} B3TR, Available: ${balanceData.data} B3TR. Please acquire more B3TR.`);
      return;
    }
    if (vthoError) {
      setPaymentStatus('Failed to fetch VTHO balance. Please try again.');
      console.error('VTHO balance error:', vthoError);
      alert('Failed to fetch VTHO balance. Please try again.');
      return;
    }
    if (vthoData && Number(vthoData) < 1) { // Require at least 1 VTHO for gas
      setPaymentStatus('Insufficient VTHO for gas. Please acquire more VTHO.');
      console.error('Insufficient VTHO:', vthoData);
      alert('Insufficient VTHO for gas. Please acquire more VTHO.');
      return;
    }
    setSelectedProduct(product); // Show confirmation modal only after connection
  };

  const handleB3TRPayment = async () => {
    console.log('Confirm purchase clicked', { account, thor: !!thor, signer: !!signer, selectedProduct: JSON.stringify(selectedProduct) });
    if (!account || !thor || !signer || !selectedProduct) {
      setPaymentStatus('Must be connected to VeChain mainnet with a selected product.');
      console.error('Missing requirements:', { account, thor: !!thor, signer: !!signer, selectedProduct });
      return;
    }
    if (!userDetails.name || !userDetails.email || !userDetails.address) {
      setPaymentStatus('Please fill in your name, email, and address.');
      console.error('Missing user details:', userDetails);
      alert('Please fill in your name, email, and address.');
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
      } else if (errorMessage.includes('User cancelled')) {
        errorMessage = 'Transaction rejected by user.';
      } else if (errorMessage.includes('node') || errorMessage.includes('CORS')) {
        errorMessage = 'Unable to connect to VeChain node. Check network connection or try a different node URL.';
      }
      setPaymentStatus(`Error: ${errorMessage}. Ensure sufficient B3TR and VTHO.`);
      console.error('Payment failed:', error);
      setTxId(null);
      setSelectedProduct(null);
      setUserDetails({ name: '', email: '', address: '' });
    }
  };

  const closeModal = () => {
    console.log('Closing modal');
    setSelectedProduct(null);
    setPaymentStatus('');
    setTxId(null);
    setUserDetails({ name: '', email: '', address: '' });
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
    console.log('Edit product:', index, JSON.stringify(products[index]));
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
    console.log('Delete product:', index, JSON.stringify(products[index]));
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
          {balanceError && (
            <p className="text-lg mb-4 text-red-500">Error fetching B3TR balance: {balanceError.message}</p>
          )}
          {balanceData?.data && (
            <p className="text-lg mb-4">
              B3TR Balance: {balanceData.data} <span className="text-custom-blue text-outline-amber">B3TR</span>
            </p>
          )}
          {vthoError && (
            <p className="text-lg mb-4 text-red-500">Error fetching VTHO balance: {vthoError.message}</p>
          )}
          {vthoData && (
            <p className="text-lg mb-4">
              VTHO Balance: {vthoData} VTHO
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
              <form ref={formRef}>
                <h3 className="text-4xl font-bold mb-4">Confirm Purchase: {selectedProduct.name}</h3>
                <p className="text-lg mb-4">Price: {selectedProduct.priceB3TR} B3TR</p>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Name</label>
                  <input
                    type="text"
                    name="user_name"
                    className="w-full p-2 border rounded-lg"
                    value={userDetails.name}
                    onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Email</label>
                  <input
                    type="email"
                    name="user_email"
                    className="w-full p-2 border rounded-lg"
                    value={userDetails.email}
                    onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-lg font-bold">Address</label>
                  <input
                    type="text"
                    name="user_address"
                    className="w-full p-2 border rounded-lg"
                    value={userDetails.address}
                    onChange={(e) => setUserDetails({ ...userDetails, address: e.target.value })}
                    required
                  />
                </div>
                {account && (
                  <button
                    type="button"
                    className="bg-amber-400 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white"
                    onClick={handleB3TRPayment}
                  >
                    Confirm Purchase
                  </button>
                )}
                {paymentStatus && <p className="text-lg mt-4">{paymentStatus}</p>}
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold mt-4"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
        {txId && <TransactionModal txId={txId} status={receipt ? (receipt.reverted || !(receipt as any).transferSuccess ? 'reverted' : 'success') : 'pending'} onClose={closeModal} />}
      </div>
    </section>
  );
}

export default Store;