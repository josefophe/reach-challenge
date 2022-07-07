import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';

const shouldFail = async (fp) => {
    let worked = undefined;
    try {
      await fp();
      worked = true;
    } catch (e) {
      worked = false;
    }
    console.log(`\tshouldFail = ${worked}`);
    if (worked !== false) {
      throw Error(`shouldFail`);
    }
  };
  

const stdlib = loadStdlib();

const startingBalance = stdlib.parseCurrency(100);

const time = stdlib.connector === 'ALGO' ? 50 : 10;

console.log('Hello, Alice and Bob!');

console.log('Launching...');

const accCreator = await stdlib.newTestAccount(startingBalance);
const Lagcoin = await stdlib.launchToken(accCreator, "Lagcoin", "LAG");
const Ikejacoin = await stdlib.launchToken(accCreator, "Ikejacoin", "IKJ");
/* 
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo()); */

const accAlice = await stdlib.newTestAccount(startingBalance);
const accBob = await stdlib.newTestAccount(startingBalance);

if ( stdlib.connector === 'ETH' || stdlib.connector === 'CFX' ) {
    const myGasLimit = 5000000;
    accAlice.setGasLimit(myGasLimit);
    accBob.setGasLimit(myGasLimit);
  } else if ( stdlib.connector == 'ALGO' ) {
    console.log(`Demonstrating need to opt-in on ALGO`);
    await shouldFail(async () => await Lagcoin.mint(accAlice, startingBalance));
    console.log(`Opt-ing in on ALGO`);
    await accAlice.tokenAccept(Lagcoin.id);
    await accAlice.tokenAccept(Ikejacoin.id);
    await accBob.tokenAccept(Lagcoin.id);
    await accBob.tokenAccept(Ikejacoin.id);
  }

  await Lagcoin.mint(accAlice, startingBalance.mul(2));
  await Ikejacoin.mint(accBob, startingBalance.mul(2));

  if ( stdlib.connector == 'ALGO' ) {
    console.log(`Demonstrating opt-out on ALGO`);
    console.log(`\tAlice opts out`);
    await Lagcoin.optOut(accAlice);
    console.log(`\tAlice can't receive mint`);
    await shouldFail(async () => await Lagcoin.mint(accAlice, startingBalance));
    console.log(`\tAlice re-opts-in`);
    await accAlice.tokenAccept(Lagcoin.id);
    console.log(`\tAlice can receive mint`);
    await Lagcoin.mint(accAlice, startingBalance);
  }  

console.log('Starting backends...');

const fmt = (x) => stdlib.formatCurrency(x, 4);
const doSwap = async (tokenA, amtA, tokenB, amtB, trusted) => {
  console.log(`\nPerforming swap of ${fmt(amtA)} ${tokenA.sym} for ${fmt(amtB)} ${tokenB.sym}`);

  const getBalance = async (tokenX, who) => {
    const amt = await stdlib.balanceOf(who, tokenX.id);
    return `${fmt(amt)} ${tokenX.sym}`; };
  const getBalances = async (who) =>
    `${await getBalance(tokenA, who)} & ${await getBalance(tokenB, who)}`;

  const beforeAlice = await getBalances(accAlice);
  const beforeBob = await getBalances(accBob);
  console.log(`Alice has ${beforeAlice}`);
  console.log(`Bob has ${beforeBob}`);

  if ( trusted ) {
    console.log(`Alice transfers to Bob honestly`);
    await stdlib.transfer(accAlice, accBob, amtA, tokenA.id);
    console.log(`Bob transfers to Alice honestly`);
    await stdlib.transfer(accBob, accAlice, amtB, tokenB.id);
  } else {
    console.log(`Alice will deploy the Reach DApp.`);
    const ctcAlice = accAlice.contract(backend);
    console.log(`Bob attaches to the Reach DApp.`);
    const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

    let succ = undefined;
    const Common = (who) => ({
      seeTimeout: () => {
        succ = false;
        console.log(`${who} saw a timeout`); },
      seeTransfer: () => {
        succ = true;
        console.log(`${who} saw the transfer happened`); },
    });

await Promise.all([
  backend.Alice(ctcAlice, {
    // implement Alice's interact object here
    ...Common(`Alice`),
    getSwap: () => {
      console.log(`Alice proposes swap`);
      return [ tokenA.id, amtA, tokenB.id, amtB, time ]; },
  }),
  backend.Bob(ctcBob, {
    ...stdlib.hasRandom,
    // implement Bob's interact object here
    ...Common(`Bob`),
    accSwap: (...v) => {
      console.log(`Bob accepts swap of`, v);
      return true; },
  }),
]);

return succ;
  }
  const afterAlice = await getBalances(accAlice);
  const afterBob = await getBalances(accBob);
  console.log(`Alice went from ${beforeAlice} to ${afterAlice}`);
  console.log(`Bob went from ${beforeBob} to ${afterBob}`);
};

const amtA = stdlib.parseCurrency(1);
const amtB = stdlib.parseCurrency(2);

if ( await doSwap(Lagcoin, amtA, Ikejacoin, amtB, false)
     && await doSwap(Ikejacoin, amtB, Lagcoin, amtA, false) ) {
  await doSwap(Lagcoin, amtA, Ikejacoin, amtB, true);
     }

console.log('Goodbye, Alice and Bob!');
