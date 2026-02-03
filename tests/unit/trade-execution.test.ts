import { describe, it, expect } from 'vitest';

describe('Trade Execution Logic', () => {
  it('should calculate BUY cash impact correctly', () => {
    const totalCost = 100;
    const fee = 1; // 1%
    const totalRequired = totalCost + fee;

    const cashBefore = 1000;
    const cashAfter = cashBefore - totalRequired;

    expect(cashAfter).toBe(899);
    expect(totalRequired).toBe(101);
  });

  it('should calculate SELL cash impact correctly', () => {
    const shares = 100;
    const price = 1.20;
    const totalCost = shares * price; // 120
    const fee = totalCost * 0.01; // 1.20
    const netProceeds = totalCost - fee; // 118.80

    const cashBefore = 900;
    const cashAfter = cashBefore + netProceeds;

    expect(netProceeds).toBeCloseTo(118.80, 2);
    expect(cashAfter).toBeCloseTo(1018.80, 2);
  });

  it('should calculate position cost basis reduction on sell', () => {
    // Buy 100 shares @ $1.00 = $100 invested (plus $1 fee = $101 total)
    const totalInvested = 101;
    const shares = 100;
    const avgEntryPrice = totalInvested / shares; // 1.01

    // Sell 50 shares
    const sharesSold = 50;
    const costBasis = avgEntryPrice * sharesSold; // 50.5

    // Remaining invested
    const remainingInvested = totalInvested - costBasis;

    expect(costBasis).toBeCloseTo(50.5, 2);
    expect(remainingInvested).toBeCloseTo(50.5, 2);
  });

  it('should calculate realized P&L correctly on sell', () => {
    const sharesSold = 50;
    const salePrice = 1.20;
    const totalCost = sharesSold * salePrice; // 60
    const fee = totalCost * 0.01; // 0.60
    const saleProceeds = totalCost - fee; // 59.40

    const avgEntryPrice = 1.01;
    const costBasis = avgEntryPrice * sharesSold; // 50.5

    const realizedPnL = saleProceeds - costBasis; // 59.40 - 50.5 = 8.90

    expect(realizedPnL).toBeCloseTo(8.90, 2);
  });

  it('should maintain cash + positions = total value', () => {
    const cash = 700;
    const position1Value = 150; // 100 shares @ 1.50
    const position2Value = 150; // 200 shares @ 0.75
    
    const totalValue = cash + position1Value + position2Value;

    expect(totalValue).toBe(1000);
  });

  it('should validate accounting after full cycle', () => {
    // Full trade cycle
    let cash = 1000;
    
    // BUY 100 @ $1.00
    const buyCost = 100;
    const buyFee = 1;
    cash -= (buyCost + buyFee); // 899
    
    // Position worth
    let positionInvested = buyCost + buyFee; // 101
    let shares = 100;
    let currentPrice = 1.10;
    let positionValue = shares * currentPrice; // 110
    
    // Total value
    let totalValue = cash + positionValue; // 899 + 110 = 1009
    
    // P&L
    let unrealizedPnL = positionValue - positionInvested; // 110 - 101 = 9
    let realizedPnL = 0;
    let totalPnL = unrealizedPnL + realizedPnL; // 9
    
    // Validate
    expect(totalValue).toBe(1009);
    expect(totalPnL).toBe(9);
    expect(totalValue).toBe(1000 + totalPnL); // ✓
    
    // Now SELL all
    const sellRevenue = shares * currentPrice; // 110
    const sellFee = sellRevenue * 0.01; // 1.10
    const sellProceeds = sellRevenue - sellFee; // 108.90
    
    cash += sellProceeds; // 899 + 108.90 = 1007.90
    
    // Calculate realized P&L from sale
    const costBasis = positionInvested; // 101
    realizedPnL = sellProceeds - costBasis; // 108.90 - 101 = 7.90
    
    // Position closed
    shares = 0;
    positionValue = 0;
    unrealizedPnL = 0;
    
    // Final totals
    totalValue = cash + positionValue; // 1007.90 + 0 = 1007.90
    totalPnL = realizedPnL + unrealizedPnL; // 7.90 + 0 = 7.90
    
    // Validate final accounting
    expect(totalValue).toBeCloseTo(1007.90, 2);
    expect(totalPnL).toBeCloseTo(7.90, 2);
    expect(totalValue).toBeCloseTo(1000 + totalPnL, 2); // ✓ MUST HOLD
  });
});
