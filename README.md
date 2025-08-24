# 微信支付MVP应用部署指南

本文档提供了部署微信支付MVP应用的详细步骤和注意事项。

## 前提条件

1. 已注册微信商户平台账号，并获取以下信息：
   - 商户ID (mchid)：1578624551
   - 微信公众号或小程序APPID：wx28817365d43cd7a0
   - 商户API密钥 (key)：TnpTheNewPerformance201620162016
   - 商户证书 (apiclient_cert.pem 和 apiclient_key.pem)
   - 商户平台证书 (平台证书公钥)：7EA72E47A4A366CF43AA59056AC0A861CDA8E8A4
   

2. 已准备好具有公网IP的服务器
   - 推荐配置：2核4G内存以上
   - 操作系统：Ubuntu 24.4

3. 已注册域名并完成备案（中国大陆地区必须）

## 部署步骤

### 1. 服务器环境准备

#### 1.1 基础环境配置

```bash
# 更新系统包
sudo apt-get update  【DONE】
sudo apt-get upgrade -y  【Done】

# 安装基础工具
sudo apt-get install -y git curl wget vim 【DONE】
```

#### 1.2 安装Node.js环境

```bash
# 安装nvm（Node版本管理器）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# 使nvm命令生效
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 安装Node.js v16（推荐版本）
nvm install 16
nvm use 16
nvm alias default 16

# 验证Node.js和npm安装
node -v  # 应显示v16.x.x
npm -v   # 应显示8.x.x或更高版本
```

#### 1.3 安装进程管理器和开发工具

```bash
# 安装PM2进程管理器
npm install -g pm2 【DONE】

# 验证PM2安装
pm2 -v

# 安装开发工具（可选）
npm install -g nodemon 【DONE】
```

### 2. 应用部署

#### 2.1 准备应用目录

```bash
# 创建应用目录并设置权限
sudo mkdir -p /var/www/pay-mvp 【DONE】
sudo chown -R $USER:$USER /var/www/pay-mvp 【DONE】
cd /var/www/pay-mvp 【DONE】

# 创建证书目录
mkdir -p certs 【DONE】
chmod 700 certs 【DONE】
```

#### 2.2 部署应用代码

```bash
# 克隆代码仓库
git clone https://github.com/imTroyZhu/pay-mvp.git

# 安装项目依赖
npm install --production

# 创建并编辑配置文件
cp config.example.js config.js
chmod 600 config.js  # 设置配置文件权限
```

#### 2.3 配置商户证书

```bash
# 将微信支付证书复制到证书目录
cp /path/to/apiclient_cert.pem certs/
cp /path/to/apiclient_key.pem certs/
cp /path/to/platform_cert.pem certs/

# 设置证书文件权限
chmod 600 certs/*
```

### 3. 配置文件说明

在`config.js`中需要配置以下内容：

```javascript
module.exports = {
  // 微信支付配置
  wechatpay: {
    mchid: '商户号',
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
  
  // 数据库配置（如果使用）
  database: {
    // ...
  }
};
```

### 4. 配置HTTPS证书

#### 4.1 安装和配置Certbot

```bash
# 安装Certbot和Nginx插件
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# 确保80和443端口未被占用
sudo lsof -i :80
sudo lsof -i :443
```

#### 4.2 申请SSL证书

```bash
# 停止Nginx服务（如果已运行）
sudo systemctl stop nginx

# 申请证书（替换your-domain.com为实际域名）
sudo certbot certonly --standalone \
  --agree-tos \
  --no-eff-email \
  --email your-email@example.com \
  -d your-domain.com

# 验证证书位置和权限
ls -l /etc/letsencrypt/live/your-domain.com/
```

#### 4.3 配置证书自动续期

```bash
# 测试续期流程
sudo certbot renew --dry-run

# 添加续期计划任务
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
```

### 5. 配置Nginx反向代理

```bash
# 安装Nginx
sudo apt-get install nginx

# 创建Nginx配置文件
sudo vi /etc/nginx/sites-available/pay-mvp
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 将HTTP请求重定向到HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # 反向代理到Node.js应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/pay-mvp /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置是否有误
sudo systemctl restart nginx
```

### 6. 启动应用

```bash
# 使用PM2启动应用
cd /var/www/pay-mvp
pm2 start app.js --name "pay-mvp"

# 设置开机自启动
pm2 startup
pm2 save
```

### 7. 微信商户平台配置

#### 7.1 配置回调地址

1. 登录微信商户平台 (pay.weixin.qq.com)
2. 进入「产品中心」-「开发配置」
3. 设置支付回调通知URL：
   - 格式：`https://your-domain.com/api/payment/notify`
   - 确保URL使用HTTPS协议
   - 确保域名已备案（中国大陆地区必须）
4. 设置退款回调通知URL：
   - 格式：`https://your-domain.com/api/refund/notify`
   - 确保与支付回调采用相同的域名

#### 7.2 配置API安全

1. 配置API安全域名：
   - 添加应用域名：`your-domain.com`
   - 添加对应的IP白名单
2. 配置证书：
   - 上传商户API证书
   - 获取证书序列号
   - 下载平台证书

#### 7.3 验证配置

1. 使用微信支付验证工具检查配置：
   - 检查回调URL可访问性
   - 验证证书配置
   - 测试API权限
2. 在开发者工具中进行接口联调

## 测试验证

### 1. 基础功能验证

```bash
# 检查应用状态
curl -I https://your-domain.com/health

# 检查Nginx配置
sudo nginx -t

# 检查SSL证书状态
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 2. 支付功能测试

1. 创建测试订单：
```bash
curl -X POST https://your-domain.com/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "total_fee": 1,
    "description": "测试商品"
  }'
```

2. 查询订单状态：
```bash
curl https://your-domain.com/api/payment/query/ORDER_ID
```

3. 检查应用日志：
```bash
# 实时查看日志
pm2 logs pay-mvp --lines 100

# 查看错误日志
cat /var/www/pay-mvp/logs/error.log
```

### 3. 回调通知测试

1. 使用微信支付测试工具：
   - 访问商户平台的「交易中心」-「交易工具」
   - 使用「支付回调通知」测试工具
   - 验证应用是否正确响应回调请求

2. 检查回调日志：
```bash
# 查看回调处理日志
grep "payment/notify" /var/www/pay-mvp/logs/access.log
```

## 常见问题

### 1. 回调通知问题

#### 1.1 回调通知未收到

1. 网络配置检查：
```bash
# 检查端口开放状态
sudo netstat -tlpn | grep -E ':80|:443'

# 检查防火墙规则
sudo ufw status
```

2. 域名解析检查：
```bash
# 验证域名解析
nslookup your-domain.com
dig your-domain.com
```

3. 回调URL配置检查：
   - 确保URL格式正确：`https://your-domain.com/api/payment/notify`
   - 验证域名已备案（中国大陆必须）
   - 检查证书是否有效

#### 1.2 回调通知报错

1. 签名验证失败：
   - 检查API密钥配置
   - 验证证书是否正确
   - 确认请求头完整性

2. 解密失败：
   - 确认API v3密钥配置正确
   - 检查密文格式

### 2. 支付问题

#### 2.1 创建订单失败

1. 配置检查：
```bash
# 检查配置文件权限
ls -l /var/www/pay-mvp/config.js

# 检查证书权限
ls -l /var/www/pay-mvp/certs/
```

2. 参数验证：
   - 确认商户号(mchid)正确
   - 验证APPID配置
   - 检查API v3密钥

3. 日志分析：
```bash
# 查看详细错误日志
pm2 logs pay-mvp --lines 200 --timestamp
```

#### 2.2 支付失败

1. 错误码查询：
   - 记录错误码和描述
   - 参考[微信支付错误码文档](https://pay.weixin.qq.com/wiki/doc/apiv3/wxpay/returncode.shtml)

2. 环境检查：
   - 确认服务器时间同步
   - 验证网络连接性
   - 检查证书有效性

### 3. 证书问题

#### 3.1 证书配置

1. 证书权限设置：
```bash
# 设置证书目录权限
chmod 700 /var/www/pay-mvp/certs

# 设置证书文件权限
chmod 600 /var/www/pay-mvp/certs/*

# 设置所有者
chown -R www-data:www-data /var/www/pay-mvp/certs
```

2. 证书有效期检查：
```bash
# 检查商户证书有效期
openssl x509 -in /var/www/pay-mvp/certs/apiclient_cert.pem -noout -dates

# 检查平台证书有效期
openssl x509 -in /var/www/pay-mvp/certs/platform_cert.pem -noout -dates
```

#### 3.2 路径配置

1. 检查配置文件中的证书路径：
   - 使用绝对路径
   - 确保路径存在且可访问
   - 验证文件权限正确

2. 运行时权限：
   - 确认应用进程有权限读取证书
   - 检查目录权限链完整性

## 安全建议

### 1. 系统安全

#### 1.1 系统更新

```bash
# 更新系统包列表
sudo apt-get update

# 安装安全更新
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 检查更新状态
apt list --upgradable
```

#### 1.2 防火墙配置

```bash
# 安装UFW防火墙
sudo apt-get install ufw

# 配置基本规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 开放必要端口
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 检查状态
sudo ufw status verbose
```

### 2. 应用安全

#### 2.1 文件权限

```bash
# 设置应用目录权限
sudo chown -R www-data:www-data /var/www/pay-mvp
find /var/www/pay-mvp -type d -exec chmod 755 {} \;
find /var/www/pay-mvp -type f -exec chmod 644 {} \;

# 设置敏感文件权限
chmod 600 /var/www/pay-mvp/config.js
chmod 600 /var/www/pay-mvp/certs/*
```

#### 2.2 密钥管理

1. API密钥轮换：
   - 每90天更换一次API v3密钥
   - 在更换前确保备份原密钥
   - 更新后验证支付功能

2. 证书管理：
   - 设置证书到期提醒
   - 保持证书私钥安全
   - 及时更新过期证书

### 3. 监控告警

#### 3.1 系统监控

```bash
# 安装监控工具
sudo apt-get install -y htop iotop

# 设置资源告警（可选）
sudo apt-get install -y sysstat
sudo systemctl enable sysstat
```

#### 3.2 日志监控

```bash
# 安装日志监控工具
sudo apt-get install -y logwatch

# 配置每日报告
sudo vi /etc/cron.daily/00logwatch
```

## 维护指南

### 1. 应用维护

#### 1.1 代码更新

```bash
# 备份当前版本
cd /var/www/pay-mvp
git tag backup-$(date +%Y%m%d)

# 更新代码
git pull

# 安装依赖
npm install --production

# 重启应用
pm2 restart pay-mvp

# 验证更新
curl -I https://your-domain.com/health
```

#### 1.2 配置更新

```bash
# 备份配置
cp config.js config.js.bak

# 更新配置
vi config.js

# 验证配置
node -e "console.log(require('./config'))"
```

### 2. 证书维护

#### 2.1 SSL证书更新

```bash
# 手动更新证书
sudo certbot renew --force-renewal

# 配置自动更新
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew --quiet && systemctl reload nginx" | sudo tee -a /etc/crontab > /dev/null

# 验证自动更新配置
sudo certbot renew --dry-run
```

#### 2.2 商户证书管理

```bash
# 检查证书有效期
openssl x509 -in certs/apiclient_cert.pem -noout -dates

# 备份证书
tar -czf certs-$(date +%Y%m%d).tar.gz certs/
```

### 3. 日志维护

#### 3.1 应用日志

```bash
# 配置PM2日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 查看日志配置
pm2 conf
```

#### 3.2 系统日志

```bash
# 安装logrotate
sudo apt-get install -y logrotate

# 配置日志轮转
sudo vi /etc/logrotate.d/pay-mvp

# 测试配置
sudo logrotate -d /etc/logrotate.d/pay-mvp
```

### 4. 性能优化

#### 4.1 Node.js性能

```bash
# 设置Node.js内存限制
pm2 restart pay-mvp --node-args="--max-old-space-size=2048"

# 开启PM2集群模式
pm2 start app.js -i max --name "pay-mvp"
```

#### 4.2 Nginx优化

```bash
# 优化Nginx配置
sudo vi /etc/nginx/nginx.conf

# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx
```

## 扩展阅读

- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [Node.js最佳实践](https://github.com/goldbergyoni/nodebestpractices/blob/master/README.chinese.md)
- [PM2文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx文档](https://nginx.org/en/docs/)