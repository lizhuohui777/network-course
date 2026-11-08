# 网络课事实核验

核验日期：2026-11-08。范围：12课47个知识点正文、46项新交互的92组情形与296个步骤，以及既有下一跳/ARP两组情形。已核对假设、逐步文字、字节范围、数字、曲线点列、通信方向、两端状态和图示语义。本文为维护记录，不进入学习正文。

**结论：本轮事实检查完成，发现的问题均已修正并定点复查，无未关闭事项。** 结论限定在课件已声明的教学条件下；浏览器布局与交互可用性由项目另外验证，不代表穷举所有协议实现。

## 本轮修正与复查结果

| 检查项 | 最终状态 |
|---|---|
| RTO规范强度 | 第6课及交互正确写明RFC 6298的1秒为建议；算例按该建议上调，而非宣称所有系统强制一致。 |
| 条件请求首部语法 | 示例为`If-None-Match: "v3"`，符合entity-tag双引号规则。 |
| Reno教学条件与步进 | 明确超时前cwnd=FlightSize=8MSS；等于阈值时本例选择拥塞避免。正常增长六步为1→2→4→8→9→10；超时恢复四步为8→1→2→4，点列正确。 |
| 图轴与辅助文字 | 正常case采用理想化确认轮次；超时case采用“事件顺序（非等时）”。读屏坐标描述使用中性“横坐标…，值…”，不把超时事件误称确认轮次。 |
| TLS 0-RTT分支 | 明确早期数据是另一可选分支，在等待本次服务器确认前随恢复尝试发送，并说明重放风险；普通恢复不必发送早期数据。 |
| 网络图节点与箭头 | 默认三节点用三角布局，直接箭头不穿过无关中间节点；DNS与TLS观察者自定义位置保留。 |
| 丢失与校验拒绝 | 真正丢失/过滤仍用途中阻断。会话无效结果完整到达应用并显示拒绝授权；证书失败显示浏览器本地验证状态，不画虚假网络中途丢失。 |
| 图示的文字交接 | 新交互导出包含各case的区块、状态、箭头、数值、曲线点及坐标轴；既有ARP包含远端与本地两组步骤，不因当前可见case漏掉另一组。 |

## 已核验规则与一手依据


| 范围 | 可用于正文与交互的准确表述 | 一手依据 |
|---|---|---|
| DNS递归与迭代 | 递归解析器承担继续查找责任；迭代应答可给转介、最终结果或错误。设备的一次递归查询可由解析器多次迭代完成。根与TLD不会替客户端自动向下一站逐层转发同一请求。 | [RFC 1034 §4.3.1、4.3.2、5.3.3](https://www.rfc-editor.org/rfc/rfc1034#section-4.3.1) |
| DNS缓存与TTL | DNS TTL单位为秒；权威记录更新不主动清除所有已缓存结果。TTL到期通常需刷新，不能保证地址健康，也不能保证立即全网切换。存在无法权威刷新时的serve-stale；常规教学时间线应明确未使用该策略。 | [RFC 1035 §3.2.1](https://www.rfc-editor.org/rfc/rfc1035#section-3.2.1)、[RFC 8767 §4–6](https://www.rfc-editor.org/rfc/rfc8767#section-4) |
| TCP字节编号 | ACK=X累计确认X之前的连续字节，表示下一期待X。SYN与FIN各占一个序列号；纯ACK不占号。双向字节编号各自独立。相对序号0不是线上ISN固定为0。 | [RFC 9293 §3.1、3.4、3.5](https://www.rfc-editor.org/rfc/rfc9293#section-3.4) |
| 握手与关闭 | 常规无数据握手示例SYN seq100→SYN+ACK seq700 ack101→ACK seq101 ack701正确。前两步不带数据是示例条件，非SYN禁止载数据。FIN仅结束本方向；四个关闭动作可合并或重传。TIME-WAIT允许处理重传FIN并隔离旧段；同时关闭两端都可能进入。 | [RFC 9293 §3.5、3.6、3.10.7.4](https://www.rfc-editor.org/rfc/rfc9293#section-3.5) |
| RTO与重传 | RTO=SRTT+max(G,4×RTTVAR)，§2.4建议不足1秒取1秒；超时RTO翻倍。无消歧信息时不能用已重传段测量RTT（Karn）；时间戳可消歧。超时不证明接收端一定没收到。 | [RFC 6298 §2、3、5.4–5.6](https://www.rfc-editor.org/rfc/rfc6298#section-2) |
| Reno窗口 | 简化模型新增预算=max(0,min(rwnd,cwnd)−未确认字节)。拥塞避免约每RTT增1MSS；慢开始翻倍依赖ACK等假设。首次超时对相应段的ssthresh不超过max(FlightSize/2,2SMSS)，示例可取等号；cwnd降至不超过1SMSS。第三个重复ACK触发快速重传，首次原始ACK不计重复；快速恢复cwnd=ssthresh+3SMSS，确认新数据后收回ssthresh。 | [RFC 5681 §3.1、3.2](https://www.rfc-editor.org/rfc/rfc5681#section-3.1) |
| MTU/MSS与消息边界 | MSS不含IP/TCP首部；通告MSS计算扣固定首部，实际发送需再扣选项。无选项IPv4/TCP、MTU1500得1460；4000可示意拆为1460+1460+1080，但非固定分段。TCP段/写入/读取边界无一一对应；应用必须自行成帧。 | [RFC 6691 §2](https://www.rfc-editor.org/rfc/rfc6691#section-2)、[RFC 9293 §3.7、3.7.1](https://www.rfc-editor.org/rfc/rfc9293#section-3.7) |
| HTTP方法与编码 | 安全指所请求语义以读取为主，允许日志等附带效果；幂等比较预期状态效果，不要求响应相同。GET内容无一般定义语义；POST不自动保密、不固定两个TCP包；HTTP/2、3线格式不能冒充HTTP/1.1文本。 | [RFC 9110 §9.2、9.3.1、9.3.3](https://www.rfc-editor.org/rfc/rfc9110#section-9.2)、[RFC 9112 §2](https://www.rfc-editor.org/rfc/rfc9112#section-2)、[RFC 9113 §4](https://www.rfc-editor.org/rfc/rfc9113#section-4)、[RFC 9114 §4](https://www.rfc-editor.org/rfc/rfc9114#section-4) |
| HTTP缓存 | 当前年龄而非每一缓存新计时决定新鲜度；max-age60且已积累Age50时，简化约余10秒。no-cache（不限定字段的响应指令）允许存储但复用前必须验证；no-store禁止相应存储，不是清理全部历史副本承诺。private（不限定字段）允许私有缓存，禁止共享缓存。304无新表示内容，依赖已有表示；ETag不必是哈希。 | [RFC 9111 §3–5.2.2](https://www.rfc-editor.org/rfc/rfc9111#section-4)、[RFC 9110 §8.8、15.4.5](https://www.rfc-editor.org/rfc/rfc9110#section-8.8) |
| TLS 1.3 | 常见完整证书握手以临时ECDHE协商秘密，CertificateVerify用证书公钥对应私钥签署握手，AEAD保护记录；不能画成证书公钥加密会话密钥传输。RSA签名仍可存在，移除的是RSA密钥传输。恢复可用PSK，可能组合新DHE，非每次都重发证书；0-RTT有重放风险且不具完整1-RTT保证。TLS恢复不恢复应用登录权限。 | [RFC 8446 §1.2、2、2.2、2.3、4.4.3、5.2、8](https://www.rfc-editor.org/rfc/rfc8446#section-2) |
| Cookie/Session与攻击 | 随机会话ID为关联键，服务端校验真实会话与权限；客户端和服务器过期独立。HttpOnly限制脚本读Cookie，不阻止XSS代用户发请求；Secure保护传输范围，不证明内容可信。CSRF可利用自动附带Cookie，不必偷Cookie或读响应；POST与HTTPS本身不防CSRF，SameSite非所有场景万能防线；XSS可能绕过CSRF防护。 | [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute)、[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)、[OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) |
| Socket与连接容量 | 已连接TCP用一对端点（四元组）区分，监听443可以同时接待不同远端；accept返回新连接套接字，原监听对象保留。固定单源IP及固定目标时临时端口数可能限制并发，不能推导全机或服务器统一65535上限；还受内存、描述符与NAT等资源影响。 | [RFC 9293 §3.4.1](https://www.rfc-editor.org/rfc/rfc9293#section-3.4.1)、[Linux accept(2)](https://man7.org/linux/man-pages/man2/accept.2.html)、[Linux tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html) |
| 端口编号 | 16位字段编号0–65535；IANA分为系统0–1023、用户1024–49151、动态/私有49152–65535。IANA分类不等于每台系统的临时端口配置。 | [IANA Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) |

## 数值与教学边界抽查

- seq2000、300字节→2000–2299→ack2300；客户端ISN500/服务器ISN900→ack501/901。FIN seq1001→ack1002，另向FIN seq8001→ack8002。
- 缺口1101–1200、后方1201–1300到达→累计ack1101；缺口重传且原先后段保留→ack1301。只有三个后续乱序段分别造成三个有效重复ACK，才达到所示Reno阈值。
- rwnd12000、cwnd8000、未确认6000→新增2000。FlightSize12MSS→示例ssthresh6MSS、快速恢复临时cwnd9MSS、新确认后6MSS。
- 长度前缀2字节大端：CAT为`00 03 43 41 54`，DOGS为`00 04 44 4f 47 53`。ASCII字母占1字节；课程混写十六进制头部与可读字母已明确为示意，动画需避免将`03`误当两个字符。
- TIME-WAIT的2MSL是规范等待表达，不能从RTT直接算出，也不能声称所有系统固定60或120秒。DNS TTL与IP TTL不是同一单位。

## 47个知识点逐项检查

下表“通过”指声明条件下的事实、数字、状态和箭头语义成立，并非穷举所有实现。参考依据见前表中同名协议分组。全部新增项均有两组可切换情形；`d2-hop`保留已有两组教学图。

| 知识点ID | 已核对重点 | 结果 |
|---|---|---|
| d1-client-server | 客户/服务角色可随具体交互改变，请求响应方向 | 通过 |
| d1-layers | TCP/IP/链路封装顺序，HTTP/3→QUIC→UDP承载 | 通过 |
| d1-addresses | 同IP不同TCP端口，TCP/UDP端口空间分开 | 通过 |
| d2-hop | 本地目标与远端默认网关，ARP广播范围及MAC揭示时机 | 通过 |
| d2-ping | ICMP回显与网页服务可独立成功/失败，18ms不是带宽 | 通过 |
| d2-dns | 解析器负责继续问，根/TLD/权威依次给线索或结果 | 通过 |
| d2-dns-traffic | 300/180/60秒，权威更新不清空旧缓存，多A不保证均分 | 通过 |
| d3-tcp-stream | HELLO/WORLD合读与拆读，ASCII字节假设 | 通过 |
| d3-udp-datagram | 独立边界与丢失B可继续到达，上层可提供可靠性 | 通过 |
| d3-sizes | 1460与1440数据空间，两种4000字节分段算术 | 通过 |
| d3-dns-transport | TC后TCP重查，普通查询可直接TCP，AXFR/IXFR区分 | 通过 |
| d4-header | seq101长20至120，ack121，SYN100确认101 | 通过 |
| d4-handshake | seq100/700与ack101/701，两端ESTABLISHED时间不同 | 通过 |
| d4-isn | 真实420000相对0，SYN后420001相对1 | 通过 |
| d4-queues | 未完成握手、已完成等待accept、SYN cookies减少状态 | 通过 |
| d5-half-close | FIN单方向，报告仍可返回，ACK+FIN可合段 | 通过 |
| d5-states | FIN-WAIT-1/2、CLOSE-WAIT、LAST-ACK、TIME-WAIT两端互换 | 通过 |
| d5-time-wait | 最终ACK丢失则重传FIN，重收FIN重新计时 | 通过 |
| d5-close-wait | 本地应用等待、合法报告与遗漏清理不能只凭状态区分 | 通过 |
| d6-reliability | 缺口1101–1200，补齐后ack1301，重传非新业务请求 | 通过 |
| d6-rto | 400ms按建议上调1s，1/2/4s退避，Karn歧义 | 通过 |
| d6-stream | 两次写与任意读取划分，五字节HELLO可HE/LLO | 通过 |
| d6-framing | 独立1字节0x05协议，5字节正文，换行转义与上限 | 通过 |
| d7-rwnd | 6KB缓存收4余2再读4回6，零窗口仍可探测 | 通过 |
| d7-cwnd | min(10,6)−4=2及min(3,6)−2=1 | 通过 |
| d7-growth | 1/2/4/8/9/10，超时8→1→2→4，cwnd/FlightSize条件 | 已修正后通过 |
| d7-fast-recovery | 原始ACK+3重复，12→阈值6→临时9→6 | 通过 |
| d8-message | HTTP/1.1请求行/Host/空行与HTTP/2伪首部/帧分开 | 通过 |
| d8-methods | POST响应未知时重试可重复创建，PUT幂等非响应相同 | 通过 |
| d8-status | 主文档200不覆盖图片404；302与304分开 | 通过 |
| d8-myths | %20可逆，POST不加密、不无限大、不固定包数 | 通过 |
| d9-connections | HTTP/2跨流TCP队头阻塞与QUIC独立流的边界 | 通过 |
| d9-cache-scope | private与public允许的缓存范围，其他条件仍需满足 | 通过 |
| d9-freshness | Age100/max-age120，115尚新鲜、125陈旧 | 通过 |
| d9-validation | v3匹配304、不匹配200/v4，no-cache与no-store | 引号修正后通过 |
| d10-threats | TLS终点能解密，后端链路另看配置，有证书非诚实证明 | 通过 |
| d10-keys | ECDHE共享秘密、握手签名、AEAD用途分开 | 通过 |
| d10-certificates | 本地信任根、域名覆盖与私钥持有证明 | 通过 |
| d10-handshake | TCP非TLS、证书完整握手、恢复与0-RTT重放风险 | 已明确早期数据分支后通过 |
| d11-session | Cookie只带会话标识，服务端会话校验与独立失效 | 通过 |
| d11-browser-risks | XSS目标页面权限与CSRF自动附带身份，SameSite条件 | 通过 |
| d11-input-risks | SQL参数化/结构白名单、上传命名隔离与权限 | 通过 |
| d11-ddos | 4连接占用及并发2/队列2是教学配置，带宽耗尽需上游 | 通过 |
| d12-visit-start | URL片段不发、DNS只获候选地址、缓存可省联网分支 | 通过 |
| d12-http-render | TCP/TLS/HTTP/2/HTML/子资源职责及失败证据分开 | 通过 |
| d12-socket | accept返回新对象，关闭A保留监听入口 | 通过 |
| d12-connection-limit | 3个四元组不混淆，单源固定目标两端口假设与真实资源限制 | 通过 |


## 最终核对记录

当前数据为46项新交互、92组情形、296步，另保留既有ARP两组情形。依据官方RFC对应章节、IANA注册表、OWASP指南与Linux手册核对相关技术主题；TCP来源正确为RFC 9293。未发现须更改既有自测答案键的算术问题。最终复查未留下已知事实错误或未关闭问题。
