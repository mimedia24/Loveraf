const DEFAULT_SERVICE_PROTECTION_FEE_MINOR=4000;

function serviceProtectionFeeMinor(){
  const configured=process.env.SERVICE_PROTECTION_FEE_MINOR;
  if(configured===undefined||configured==='')return DEFAULT_SERVICE_PROTECTION_FEE_MINOR;
  const fee=Number(configured);
  if(!Number.isSafeInteger(fee)||fee<0)throw new Error('SERVICE_PROTECTION_FEE_MINOR must be a non-negative integer.');
  return fee;
}

function calculateOrderTotals(lines,discountMinor=0){
  const subtotalMinor=lines.reduce((sum,line)=>sum+line.product.priceMinor*line.qty,0);
  if(!Number.isSafeInteger(discountMinor)||discountMinor<0||discountMinor>subtotalMinor)throw new Error('Invalid order discount.');
  const deliveryMinor=0;
  const feeMinor=lines.length?serviceProtectionFeeMinor():0;
  return {subtotalMinor,discountMinor,deliveryMinor,feeMinor,totalMinor:subtotalMinor-discountMinor+deliveryMinor+feeMinor};
}

module.exports={calculateOrderTotals,serviceProtectionFeeMinor};
