const fs = require('fs');

module.exports = {
  // 微信支付配置
  wechatpay: {
    mchid: '商户号',
    appid: '公众号或小程序APPID',
    privateKey: fs.readFileSync('/path/to/apiclient_key.pem'), // 商户私钥
    serialNo: '商户证书序列号',
    apiV3Key: 'API v3密钥',
    platformCertificate: fs.readFileSync('/path/to/platform_cert.pem'), // 平台证书
    notifyUrl: 'https://your-domain.com/api/payment/notify', // 支付结果通知回调地址
    refundNotifyUrl: 'https://your-domain.com/api/refund/notify', // 退款结果通知回调地址
  },
  
  // 服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  
  // 日志配置
  logger: {
    level: 'info',
    filename: 'logs/app.log'
  }
};