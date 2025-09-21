import React from 'react';
import useWebSocket from 'react-use-websocket';
import { NODE_URL } from '../config';
import { BloomFilter, Hex } from '@vechain/sdk-core';

type Beat = {
  number: number;
  id: string;
  parentID: string;
  timestamp: number;
  txsFeatures: number;
  gasLimit: number;
  bloom: string;
  k: number;
  obsolete: boolean;
};

const DELAY = 100;

const useBeats = (addressesOrData: (string | `0x${string}` | null | undefined)[]) => {
  const [block, setBlock] = React.useState<Beat | null>(null);
  const { lastJsonMessage } = useWebSocket(
    `${NODE_URL}/subscriptions/beat2`.replace('http', 'ws'),
    {
      share: true,
      shouldReconnect: () => true,
    }
  );

  React.useEffect(() => {
    const newBlock = lastJsonMessage as Beat | null;
    if (!newBlock) {
      return;
    }
    try {
      const bloomFilter = new BloomFilter(Hex.of(newBlock.bloom).bytes, newBlock.k);
      const dataInBlock = (data: string) => bloomFilter.contains(Hex.of(data));
      const isRelevantBlock = addressesOrData
        .filter((value): value is string => Boolean(value))
        .some(dataInBlock);
      if (isRelevantBlock) {
        setTimeout(() => {
          setBlock(newBlock);
          console.log('Beat received:', newBlock);
        }, DELAY);
      }
    } catch (error) {
      console.error('Error processing block:', error);
    }
  }, [lastJsonMessage, addressesOrData]);

  return block;
};

export { useBeats };