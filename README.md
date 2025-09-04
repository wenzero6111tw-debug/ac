# ac
简易记账

利用google sheet表格进行数据存储和配置管理,利用apps script进行脚本和页面部署.

表格一共4张字表如下

1、Transactions:
timestamp	subcategory	category	amount	role	currency	note

2、Config_Roles:
role_id	role_name	password

3、Config_Currency:currency_code

4、Config_Categories:category	subcategory



 

## 本地测试

```bash
npm test
```

以上命令会运行后端单元测试。测试文件及 Node 依赖在部署到 Google Apps Script 时会被 `.claspignore` 排除。
