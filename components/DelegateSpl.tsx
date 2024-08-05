import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const DelegateSpl: FC = () => {
  const [txSig, setTxSig] = useState("");
  const [delegate, setDelegate] = useState("");

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const DECIMALS = 6;
  const link = () => {
    return txSig
      ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
      : "";
  };

  const handleDelegate = async (event) => {
    event.preventDefault();
    if (!connection || !publicKey) {
      return;
    }

    const mintPubKey = new web3.PublicKey(event.target.mint.value);
    const delegatePubKey = new web3.PublicKey(event.target.delegate.value);

    try {
      const transaction = new web3.Transaction();
      let amount = event.target.amount.value;
      amount = BigInt(amount * Math.pow(10, DECIMALS));

      // Get the ATA PubKey for the source account
      const sourceAtaPubKey = await getAssociatedTokenAddress(
        mintPubKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Check if the source token account exists
      const sourceAtaInfo = await connection.getAccountInfo(sourceAtaPubKey);
      if (!sourceAtaInfo) {
        throw new Error("Source token account does not exist.");
      }

      // Check the source token balance
      const sourceAta = await getAccount(connection, sourceAtaPubKey);
      if (sourceAta.amount < amount) {
        throw new Error("Source account does not have enough balance");
      }

      // Get the pub key of ATA for the delegate's token account
      const delegateAtaPubKey = await getAssociatedTokenAddress(
        mintPubKey,
        delegatePubKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Check if the delegate's ATA exists
      const delegateAtaInfo = await connection.getAccountInfo(
        delegateAtaPubKey,
      );

      if (!delegateAtaInfo) {
        // If the delegate's ATA doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            delegateAtaPubKey, // associatedToken
            delegatePubKey, // owner
            mintPubKey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      // Add approve token instruction
      transaction.add(
        createApproveInstruction(
          sourceAtaPubKey,
          delegateAtaPubKey,
          publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          ...latestBlockhash,
        },
        "confirmed",
      );

      setTxSig(signature);
      setDelegate(delegateAtaPubKey.toString());
    } catch (error) {
      console.error("Error delegating tokens:", error);
    }
  };

  return (
    <div>
      {publicKey ? (
        <form onSubmit={handleDelegate} className={styles.form}>
          <label htmlFor="mint">Token Mint:</label>
          <input
            id="mint"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Mint"
            required
          />
          <label htmlFor="amount">Amount to delegate:</label>
          <input
            id="amount"
            type="text"
            className={styles.formField}
            placeholder="e.g. 10"
            required
          />
          <label htmlFor="delegate">Delegate SPL token to:</label>
          <input
            id="delegate"
            type="text"
            className={styles.formField}
            placeholder="Enter PublicKey to Delegate to"
            required
          />
          <button type="submit" className={styles.formButton}>
            Delegate
          </button>
        </form>
      ) : null}
      {txSig ? (
        <div>
          <p>Delegate ATA Address: {delegate} </p>
          <p>View your transaction on </p>
          <a href={link()} target="_blank" rel="noopener noreferrer">
            Solana Explorer
          </a>
        </div>
      ) : null}
    </div>
  );
};
