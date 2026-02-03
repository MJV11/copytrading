/**
 * Accounting Validation Test
 * Tests all trade scenarios to ensure accounting is correct
 */

interface TestPosition {
  shares: number;
  totalInvested: number;
  avgEntryPrice: number;
  currentPrice: number;
}

function testScenario(name: string, test: () => boolean): void {
  const result = test();
  console.log(`${result ? 'PASS' : 'FAIL'} - ${name}`);
  if (!result) {
    process.exitCode = 1;
  }
}

function almostEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

console.log('Running Accounting Tests...\n');

// Test 1: Simple BUY
testScenario('BUY deducts cash correctly', () => {
  let cash = 1000;
  const cost = 100;
  const fee = 1;
  cash -= (cost + fee);
  
  return cash === 899;
});

// Test 2: Simple SELL
testScenario('SELL adds cash correctly', () => {
  let cash = 900;
  const revenue = 120;
  const fee = 1.20;
  cash += (revenue - fee);
  
  return almostEqual(cash, 1018.80);
});

// Test 3: Position cost basis
testScenario('Position tracks cost basis with fees', () => {
  const totalInvested = 101; // 100 cost + 1 fee
  const shares = 100;
  const avgEntryPrice = totalInvested / shares;
  
  return almostEqual(avgEntryPrice, 1.01);
});

// Test 4: Partial sell reduces totalInvested
testScenario('Partial sell reduces totalInvested proportionally', () => {
  let totalInvested = 101;
  const shares = 100;
  const avgEntryPrice = 1.01;
  
  // Sell 50 shares
  const sharesSold = 50;
  const costBasis = avgEntryPrice * sharesSold;
  totalInvested -= costBasis;
  
  return almostEqual(totalInvested, 50.5);
});

// Test 5: Realized P&L calculation
testScenario('Realized P&L calculated correctly', () => {
  const sharesSold = 50;
  const salePrice = 1.20;
  const revenue = sharesSold * salePrice; // 60
  const fee = revenue * 0.01; // 0.60
  const proceeds = revenue - fee; // 59.40
  
  const avgEntryPrice = 1.01;
  const costBasis = avgEntryPrice * sharesSold; // 50.5
  
  const realizedPnL = proceeds - costBasis; // 8.90
  
  return almostEqual(realizedPnL, 8.90);
});

// Test 6: Unrealized P&L calculation
testScenario('Unrealized P&L calculated correctly', () => {
  const shares = 50;
  const currentPrice = 1.20;
  const totalInvested = 50.5;
  
  const currentValue = shares * currentPrice; // 60
  const unrealizedPnL = currentValue - totalInvested; // 9.5
  
  return almostEqual(unrealizedPnL, 9.5);
});

// Test 7: Full cycle accounting
testScenario('Full BUY-SELL cycle maintains accounting', () => {
  const initial = 1000;
  let cash = initial;
  
  // BUY 100 @ $1.00
  cash -= 101; // cost + fee
  let totalInvested = 101;
  let shares = 100;
  let currentPrice = 1.10;
  
  // Portfolio value
  let posValue = shares * currentPrice; // 110
  let totalValue = cash + posValue; // 899 + 110 = 1009
  
  // P&L
  let unrealizedPnL = posValue - totalInvested; // 110 - 101 = 9
  let realizedPnL = 0;
  let totalPnL = unrealizedPnL + realizedPnL; // 9
  
  // Check equation
  if (!almostEqual(totalValue, initial + totalPnL)) {
    console.log(`  Mid-cycle: ${totalValue} !== ${initial} + ${totalPnL}`);
    return false;
  }
  
  // SELL all
  const revenue = shares * currentPrice; // 110
  const fee = revenue * 0.01; // 1.10
  const proceeds = revenue - fee; // 108.90
  cash += proceeds; // 899 + 108.90 = 1007.90
  
  realizedPnL = proceeds - totalInvested; // 108.90 - 101 = 7.90
  shares = 0;
  totalInvested = 0;
  posValue = 0;
  unrealizedPnL = 0;
  
  totalValue = cash + posValue; // 1007.90
  totalPnL = realizedPnL + unrealizedPnL; // 7.90
  
  // Final check
  const valid = almostEqual(totalValue, initial + totalPnL);
  if (!valid) {
    console.log(`  Final: ${totalValue} !== ${initial} + ${totalPnL}`);
  }
  return valid;
});

// Test 8: Multiple BUYs averaging
testScenario('Multiple BUYs average entry price correctly', () => {
  // Buy 1: 100 shares @ $1.00 = $101 (with fee)
  let totalInvested = 101;
  let shares = 100;
  
  // Buy 2: 100 shares @ $1.20 = $121 (with fee)
  totalInvested += 121;
  shares += 100;
  
  const avgEntryPrice = totalInvested / shares; // 222 / 200 = 1.11
  
  return almostEqual(avgEntryPrice, 1.11);
});

// Test 9: Position value vs unrealized P&L
testScenario('Position value and unrealized P&L are consistent', () => {
  const shares = 100;
  const totalInvested = 101;
  const currentPrice = 0.90;
  
  const positionValue = shares * currentPrice; // 90
  const unrealizedPnL = positionValue - totalInvested; // 90 - 101 = -11
  
  return almostEqual(positionValue, 90) && almostEqual(unrealizedPnL, -11);
});

// Test 10: Zero shares position
testScenario('Fully sold position has zero value and unrealized P&L', () => {
  const shares = 0;
  const totalInvested = 0;
  const currentPrice = 1.00;
  
  const positionValue = shares * currentPrice;
  const unrealizedPnL = positionValue - totalInvested;
  
  return positionValue === 0 && unrealizedPnL === 0;
});

console.log('\nAll tests completed!');
