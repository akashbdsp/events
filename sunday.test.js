const sunday = require('./sunday');
//const {mockAxios} = require('jest-mock-axios');
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
describe('Unit tests', () => {
  test('No transaction returns empty object', () => {
    expect(sunday.getAggregatedTransactions([])).toMatchObject({})
  });

  test('Simple transactions for one merchant', () => {
    const transactions = [{
      "id": "1",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 5,
      "fee": 0.03,
      "fixed_fee": 0.5
    }]
    expect(sunday.getAggregatedTransactions(transactions)).toMatchObject({'1': 4.35})
  });

  test('Transactions for one merchant', () => {
    const transactions = [{
      "id": "1",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 5,
      "fee": 0.03,
      "fixed_fee": 0.5
    },
    {
      "id": "2",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 5,
      "fee": 0.02,
      "fixed_fee": 0.5
    }]
    expect(sunday.getAggregatedTransactions(transactions)).toMatchObject({'1': 8.75})
  });

  test('Multiple merchant Transactions', () => {
    const transactions = [{
      "id": "1",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 5,
      "fee": 0.02,
      "fixed_fee": 0.5
    },
    {
      "id": "2",
      "event": "PAYMENT",
      "merchant_id": "2",
      "value": 8,
      "fee": 0.02,
      "fixed_fee": 0.5
    },
    {
      "id": "3",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 6,
      "fee": 0.04,
      "fixed_fee": 0.5
    },
    {
      "id": "4",
      "event": "PAYMENT",
      "merchant_id": "2",
      "value": 6,
      "fee": 0.04,
      "fixed_fee": 0.5
    }]
    expect(sunday.getAggregatedTransactions(transactions)).toMatchObject({ '1': 9.66, '2': 12.6 })
  });

  test('TRansaction with partial refund', () => {
    const transactions = [{
      "id": "1",
      "event": "PAYMENT",
      "merchant_id": "1",
      "value": 5,
      "fee": 0.02,
      "fixed_fee": 0.5
    },    
    {
      "id": "2",
      "event": "REFUND",
      "merchant_id": "1",
      "value": 1,
      "transaction_id": "1"
    }]
    var expectedPayout = 3.4200000000000004; //(5 - 1) * (1 - 0.02) - 0.5;
    expect(sunday.getAggregatedTransactions(transactions)).toMatchObject({ '1': expectedPayout})
  });

})

describe('Integrated requests (axios mocked)', () => {
  beforeAll(() => {
    mock = new MockAdapter(axios);
  });
  afterEach(() => {
    mock.reset();
  });

  const transactions = [{
    "id": "1",
    "event": "PAYMENT",
    "merchant_id": "1",
    "value": 5,
    "fee": 0.02,
    "fixed_fee": 0.5
  },
  {
    "id": "1",
    "event": "PAYMENT",
    "merchant_id": "2",
    "value": 8,
    "fee": 0.02,
    "fixed_fee": 0.5
  },
  {
    "id": "1",
    "event": "PAYMENT",
    "merchant_id": "1",
    "value": 6,
    "fee": 0.04,
    "fixed_fee": 0.5
  },
  {
    "id": "1",
    "event": "PAYMENT",
    "merchant_id": "2",
    "value": 6,
    "fee": 0.04,
    "fixed_fee": 0.5
  }]

  const merchants = [
    {
			"id": "1",
			"name": "Burger King",
			"iban": "GB02BARC20038034488357"
		},
		{
			"id": "2",
			"name": "Macdonalds",
			"iban": "GB12BARC20032624655975"
		}
  ]

  const merchantsEndpoint = 'https://my-json-server.typicode.com/akashbdsp/sunday/merchants'
  const transactionsEndpoint = 'https://my-json-server.typicode.com/akashbdsp/sunday/events'

  test('Payouts map from backend mock', async () => {
    mock.onGet().reply(200, transactions);
    expect(await sunday.getPayouts(transactionsEndpoint)).toMatchObject({ '1': 9.66, '2': 12.6 })
  });

  test('Merchant payouts from backend mock', async () => {
    mock.onGet(merchantsEndpoint).reply(200, merchants);
    mock.onGet(transactionsEndpoint).reply(200, transactions);
    const result = await sunday.getMerchantPayouts(merchantsEndpoint, transactionsEndpoint)
    expect(result[0]).toMatchObject({
      "id": "1",
      "name": "Burger King",
      "iban": "GB02BARC20038034488357",
      "payout": 9.66
    })
    expect(result[1]).toMatchObject({
      "id": "2",
      "name": "Macdonalds",
      "iban": "GB12BARC20032624655975",
      "payout": 12.6
    })
  });

})
