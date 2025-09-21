export const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS ?? '0x8d5fb3e576bbe08279a3a64194c01b36d4bbb0c9';
if (!RECIPIENT_ADDRESS) {
  throw new Error('REACT_APP_RECIPIENT_ADDRESS must be set');
}
export const WALLET_CONNECT_PROJECT_ID = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID ?? '';
export const NODE_URL = process.env.REACT_APP_NODE_URL ?? 'https://mainnet.vechain.org';
export const NETWORK = process.env.REACT_APP_NETWORK ?? 'main';
export const DELEGATION_URL = process.env.REACT_APP_DELEGATION_URL ?? '';
export const APP_TITLE = process.env.REACT_APP_APP_TITLE ?? 'B3TR BEACH Store';
export const APP_DESCRIPTION = process.env.REACT_APP_APP_DESCRIPTION ?? 'Shop for eco-friendly merchandise and pay with B3TR tokens!';
export const APP_ICONS = (process.env.REACT_APP_APP_ICONS ?? '').split(',');
