const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { WechatPay } = require('wechatpay-node-v3');
const fs = require('fs');
const path = require('path');

// 初始化微信支付配置
const wechatpay = new WechatPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  privateKey: fs.readFileSync(path.join(__dirname, '../certs/apiclient_key.pem')),
  serialNo: process.env.WECHAT_SERIAL_NO,
  apiV3Key: process.env.WECHAT_API_V3_KEY,
  platformCertificate: fs.readFileSync(path.join(__dirname, '../certs/platform_cert.pem'))
});

// 生成支付二维码
router.post('/create', async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    // 创建订单
    const result = await wechatpay.transactions_native({
      description,
      out_trade_no: Date.now().toString(),
      notify_url: `${process.env.BASE_URL}/api/payment/notify`,
      amount: {
        total: amount,
        currency: 'CNY'
      }
    });

    // 生成二维码
    const qrcode = await QRCode.toDataURL(result.code_url);
    
    res.json({
      success: true,
      qrcode,
      orderId: result.out_trade_no
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支付订单失败'
    });
  }
});

// 支付结果通知处理
router.post('/notify', async (req, res) => {
  try {
    // 验证签名和解密数据
    const result = await wechatpay.verifyNotify(req.headers, req.body);
    
    if (result.trade_state === 'SUCCESS') {
      // 处理支付成功逻辑
      console.log('支付成功:', result);
      
      // 返回成功响应
      res.json({
        code: 'SUCCESS',
        message: '成功'
      });
    } else {
      // 处理其他支付状态
      console.log('支付状态:', result.trade_state);
      res.json({
        code: 'FAIL',
        message: '支付未完成'
      });
    }
  } catch (error) {
    console.error('处理支付通知失败:', error);
    res.status(500).json({
      code: 'FAIL',
      message: '处理支付通知失败'
    });
  }
});

// 查询支付状态
router.get('/status/:orderId', async (req, res) => {
  try {
    const result = await wechatpay.queryOrder({
      out_trade_no: req.params.orderId
    });
    
    res.json({
      success: true,
      status: result.trade_state
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询支付状态失败'
    });
  }
});

module.exports = router;