import React, { useState } from 'react';
import { DAppKitProvider } from '@vechain/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NODE_URL, WALLET_CONNECT_PROJECT_ID, APP_TITLE, APP_DESCRIPTION, APP_ICONS } from './config';
import Header from './components/Header';
import Store from './components/Store';
import Footer from './components/Footer';
import './index.css';

const queryClient = new QueryClient();

const walletConnectOptions = !WALLET_CONNECT_PROJECT_ID
  ? undefined
  : {
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: APP_TITLE,
        description: APP_DESCRIPTION,
        url: window.location.origin,
        icons: APP_ICONS
      }
    };

function App() {
  const [showManageForm, setShowManageForm] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider
        node={NODE_URL}
        usePersistence={true}
        walletConnectOptions={walletConnectOptions}
        useFirstDetectedSource={true}
      >
        <div>
          <Header />
          <Store showManageForm={showManageForm} setShowManageForm={setShowManageForm} />
          <Footer setShowManageForm={setShowManageForm} />
        </div>
      </DAppKitProvider>
    </QueryClientProvider>
  );
}

export default App;
