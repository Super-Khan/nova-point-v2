/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { BigDecimal, BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  AccountCToken,
  Account,
  AccountCTokenTransaction,
  RatePerBlock
} from "../../generated/schema";
import { CToken } from "../../generated/templates/CToken/CToken";

export function exponentToBigDecimal(decimals: number): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export let mantissaFactor = 18;
export let mantissaFactorBD: BigDecimal = exponentToBigDecimal(18);
export let zeroBD = BigDecimal.fromString("0");

export function createAccountCToken(
  cTokenStatsID: string,
  symbol: string,
  account: string,
  marketID: string
): AccountCToken {
  let cTokenStats = new AccountCToken(cTokenStatsID);
  cTokenStats.symbol = symbol;
  cTokenStats.market = marketID;
  cTokenStats.account = account;
  cTokenStats.accrualBlockNumber = BigInt.fromI32(0);
  cTokenStats.cTokenBalance = zeroBD;
  cTokenStats.totalUnderlyingSupplied = zeroBD;
  cTokenStats.totalUnderlyingRedeemed = zeroBD;
  cTokenStats.accountBorrowIndex = zeroBD;
  cTokenStats.totalUnderlyingBorrowed = zeroBD;
  cTokenStats.totalUnderlyingRepaid = zeroBD;
  cTokenStats.storedBorrowBalance = zeroBD;
  cTokenStats.enteredMarket = false;
  return cTokenStats;
}

export function createAccount(accountID: string): Account {
  let account = new Account(accountID);
  account.countLiquidated = 0;
  account.countLiquidator = 0;
  account.countRedeemer = 0;
  account.countRedeemed = 0;
  account.hasBorrowed = false;
  account.save();
  return account;
}

export function updateCommonCTokenStats(
  marketID: string,
  marketSymbol: string,
  accountID: string,
  tx_hash: Bytes,
  timestamp: BigInt,
  blockNumber: BigInt,
  logIndex: BigInt
): AccountCToken {
  let cTokenStatsID = marketID + "-" + accountID;
  let cTokenStats = AccountCToken.load(cTokenStatsID);
  if (cTokenStats == null) {
    cTokenStats = createAccountCToken(
      cTokenStatsID,
      marketSymbol,
      accountID,
      marketID
    );
  }
  getOrCreateAccountCTokenTransaction(
    cTokenStatsID,
    tx_hash,
    timestamp,
    blockNumber,
    logIndex
  );
  cTokenStats.accrualBlockNumber = blockNumber;
  return cTokenStats as AccountCToken;
}

export function getOrCreateAccountCTokenTransaction(
  accountID: string,
  tx_hash: Bytes,
  timestamp: BigInt,
  block: BigInt,
  logIndex: BigInt
): AccountCTokenTransaction {
  let id = accountID + "-" + tx_hash.toHexString() + "-" + logIndex.toString();
  let transaction = AccountCTokenTransaction.load(id);

  if (transaction == null) {
    transaction = new AccountCTokenTransaction(id);
    transaction.account = accountID;
    transaction.tx_hash = tx_hash;
    transaction.timestamp = timestamp;
    transaction.block = block;
    transaction.logIndex = logIndex;
    transaction.save();
  }

  return transaction as AccountCTokenTransaction;
}

export function saveRatePerBlock(address: Address, timestamp: BigInt): void {
  let contract = CToken.bind(address);

  let supplyRatePerBlock = contract.try_supplyRatePerBlock();
  let borrowRatePerBlock = contract.try_borrowRatePerBlock();
  if (!supplyRatePerBlock.reverted && !borrowRatePerBlock.reverted) {
    let ratePerBlockId = address.toHexString() + "-" + timestamp.toString()

    let ratePerBlock = new RatePerBlock(ratePerBlockId);
    ratePerBlock.timestamp = timestamp
    ratePerBlock.address = address;
    ratePerBlock.supplyRatePerBlock = supplyRatePerBlock.value;
    ratePerBlock.borrowRatePerBlock = borrowRatePerBlock.value;
    ratePerBlock.save();
  }
}