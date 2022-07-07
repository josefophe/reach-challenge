'reach 0.1';

const Common = {
    seeTimeout: Fun([], Null),
    seeTransfer: Fun([], Null),
  };

export const main = Reach.App(() => {
  const A = Participant('Alice', {
    // Specify Alice's interact interface here
    ...Common,
    getSwap: Fun([], Tuple(Token, UInt, Token, UInt, UInt)),
  });
  const B = Participant('Bob', {
    // Specify Bob's interact interface here
    ...Common,
    accSwap: Fun([Token, UInt, Token, UInt], Bool),
  });
  init();
  // The first one to publish deploys the contract
  A.only(() => {
    const [ tokenA, amtA, tokenB, amtB, time ] = declassify(interact.getSwap());
    assume(tokenA != tokenB); });
  A.publish(tokenA, amtA, tokenB, amtB, time);
  commit();
  A.pay([ [amtA, tokenA] ]);
  commit();
  // The second one to publish always attaches 
  B.only(() => {
    const bwhen = declassify(interact.accSwap(tokenA, amtA, tokenB, amtB)); });
    B.pay([ [amtB, tokenB] ])
    .when(bwhen)
    .timeout(relativeTime(time), () => {
        A.publish();
        transfer(amtA, tokenA).to(A);
        each([A, B], () => interact.seeTimeout());
        commit();
        exit();
 });
transfer(amtB, tokenB).to(A);
transfer([ [amtA, tokenA] ]).to(B);
each([A, B], () => interact.seeTransfer());
  commit();
  // write your program here
  exit();
});
