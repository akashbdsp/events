const axios = require('axios')

const calculateTransaction = (value, fee, fixedFee) => (value * (1 - fee) - fixedFee)

const getAggregatedTransactions = (transactions) => {
  // reduce 
  return transactions.reduce((map, transaction) => {
    let transactionValue = 0
    if (transaction.event === 'REFUND') {
      const originalPayment = transactions.find(p => p.id === transaction["transaction_id"])
      // 5 * 0.98 - 0.5 
      // -1 * 1 * 0.98
      transactionValue = (-1) * transaction.value * (1 - originalPayment.fee); 
    } else {
      transactionValue = calculateTransaction(transaction.value, transaction['fee'], transaction['fixed_fee'])
    }    
    return {
      ...map,
      [transaction['merchant_id']]: (map[transaction['merchant_id']] || 0) + transactionValue,
    }
  }, {})
}

const getPayouts = async (transactionsUEndpoint) => {  
  const response = await axios.get(transactionsUEndpoint)
  const transactions = response.data
  return getAggregatedTransactions(transactions)
}

const getMerchantPayouts = async (merchantsEndpoint, transactionsUEndpoint) => {
  const payouts = await getPayouts(transactionsUEndpoint)
  const response = await axios.get(merchantsEndpoint)
  const merchants = response.data
  return Object.keys(payouts).reduce((arr,key) => {
    const merchant = merchants.find(m => m.id === key)
    return [...arr, {
      ...merchant,
      payout: payouts[key]
    }]
  }, [])
}

module.exports = {getAggregatedTransactions, getPayouts, getMerchantPayouts};

//getPayouts('https://my-json-server.typicode.com/akashbdsp/sunday/events').then(aggrTrans => console.log(aggrTrans))
//getMerchantPayouts('https://my-json-server.typicode.com/akashbdsp/sunday/merchants','https://my-json-server.typicode.com/akashbdsp/sunday/events')
//  .then(aggrTrans => console.log(aggrTrans))