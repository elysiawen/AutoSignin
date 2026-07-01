import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-text-primary mb-2">用户服务协议</h1>
          <p className="text-sm text-text-quaternary mb-8">最后更新日期：2026年7月1日</p>

          <div className="prose prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
            <p>
              欢迎使用 AutoSignin 自动签到管理平台（以下简称「本平台」）。在使用本平台之前，请仔细阅读并同意以下条款。
            </p>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">一、服务说明</h2>
              <p>
                本平台是一个开源的自动签到任务管理工具，旨在帮助用户自动化执行各游戏平台的每日签到、社区任务等重复性操作。本平台以 MIT 协议开源，用户可自由部署和使用。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">二、账号与安全</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>用户应提供真实、准确的注册信息，并妥善保管账号密码。</li>
                <li>用户在本平台中添加的第三方平台账号凭证（如 Cookie、Token 等）仅存储于用户自行部署的数据库中，本平台不会收集或上传至任何第三方服务器。</li>
                <li>用户应定期更换密码，避免账号被他人盗用。</li>
                <li>用户不应与他人共享账号，因共享账号导致的一切后果由用户自行承担。</li>
                <li>因用户自身原因导致的账号泄露或凭证被盗，本平台不承担责任。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">三、用户行为规范</h2>
              <p>用户在使用本平台时，应遵守以下规范：</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>合法使用</strong>：不得利用本平台从事任何违反法律法规的活动。</li>
                <li><strong>合理使用</strong>：应合理设置定时任务频率，避免对目标平台造成不必要的请求负担。</li>
                <li><strong>自担风险</strong>：使用自动签到功能可能违反目标平台的服务条款，由此产生的任何后果（包括但不限于账号封禁、奖励回收等）由用户自行承担。</li>
                <li><strong>禁止滥用</strong>：不得利用本平台进行批量注册、恶意刷取奖励、攻击目标平台等行为。</li>
                <li><strong>禁止转售</strong>：不得将本平台作为商业服务对外提供，包括但不限于代签服务、付费托管等。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">四、第三方平台声明</h2>

              <h3 className="text-sm font-semibold text-text-primary mt-4 mb-2">版权归属</h3>
              <p className="mb-3">
                本平台涉及的各游戏平台及其知识产权归属如下：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm mb-4">
                <li><strong>米哈游（miHoYo / HoYoverse）</strong>：米游社、原神、崩坏3、崩坏：星穹铁道、绝区零等</li>
                <li><strong>鹰角网络（Hypergryph）</strong>：森空岛、明日方舟、明日方舟：终末地等</li>
                <li><strong>库洛游戏（Kuro Games）</strong>：库街区、鸣潮、战双帕弥什等</li>
                <li><strong>完美世界 / Hotta Studio</strong>：塔吉多、幻塔、异环等</li>
              </ul>
              <p className="text-sm text-text-tertiary mb-4">
                上述所有游戏名称、品牌、商标、角色及相关知识产权均归各自公司所有。
              </p>

              <h3 className="text-sm font-semibold text-text-primary mt-4 mb-2">平台性质</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>本平台为独立第三方辅助工具，由个人开发者开发和维护，与上述任何游戏公司无任何隶属、授权或官方关联关系。</li>
                <li>本平台不代表任何游戏公司的官方立场，不提供任何官方游戏客服支持，如遇游戏问题请通过官方渠道反馈。</li>
                <li>本工具通过调用各游戏平台的公开接口实现自动签到，属于用户自助使用工具。</li>
                <li>使用本平台进行的签到操作均通过用户自身的合法凭证完成，本平台不会代替用户进行任何未经授权的操作。</li>
              </ol>

              <h3 className="text-sm font-semibold text-text-primary mt-4 mb-2">使用风险</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>各游戏平台的服务条款、接口规范及账号管理政策可能随时由对应公司单方面变更。</li>
                <li>自动化签到行为可能触发游戏平台的风控机制，导致账号被限制或封禁。</li>
                <li>各平台接口变更可能导致签到功能临时或永久失效。</li>
                <li>用户须自行知悉并承担上述全部风险，本平台不对因使用本工具导致的任何账号损失、游戏损失或其他损失承担任何法律责任。</li>
              </ol>

              <h3 className="text-sm font-semibold text-text-primary mt-4 mb-2">服务可用性</h3>
              <p>
                本平台不对服务的持续可用性作出任何承诺。游戏官方接口变更或下线、不可抗力因素、开发者停止维护等情况均可能导致服务中断，本平台不承担任何赔偿责任。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">五、数据收集范围</h2>
              <p className="mb-3">本平台仅收集以下与签到功能直接相关的数据：</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>账号信息</strong>：您通过登录授权获取的游戏平台凭证（Cookie、Token、Stoken 等）及平台用户标识（UID、MID 等）。</li>
                <li><strong>设备信息</strong>：用于签到请求的设备标识（deviceId、设备指纹等），由各平台签到接口要求生成。</li>
                <li><strong>任务配置</strong>：您创建的签到任务类型、Cron 定时表达式等配置信息。</li>
                <li><strong>执行日志</strong>：签到任务的执行结果、时间戳和奖励信息。</li>
                <li><strong>通知配置</strong>：您配置的推送渠道信息（如 Telegram Chat ID、Discord Webhook URL 等）。</li>
              </ol>
              <p className="mt-3 text-sm text-text-tertiary">✅ 我们不收集您的真实姓名、身份证、银行卡或支付信息。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">六、数据使用方式</h2>
              <p className="mb-3">您的数据仅用于以下目的：</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>定时调用各游戏平台的签到接口，完成自动签到任务。</li>
                <li>刷新过期的登录凭证，保持签到功能正常运行。</li>
                <li>记录签到状态日志，供您查阅执行结果。</li>
                <li>向您配置的推送渠道发送签到结果通知。</li>
                <li>您的数据不会用于任何商业目的、广告推送、用户画像或其他与签到无关的用途。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">七、数据安全</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>凭证加密</strong>：用户添加的平台账号凭证（Cookie、Token 等）使用 AES-256-GCM 加密算法加密存储，密钥由用户自行配置。</li>
                <li><strong>传输安全</strong>：建议通过 HTTPS 部署本平台，防止中间人攻击窃取凭证。</li>
                <li><strong>访问控制</strong>：本平台采用频率限制、接口鉴权、中间件拦截等安全措施保护用户数据。</li>
                <li><strong>数据隔离</strong>：每个用户的数据相互隔离，普通用户无法访问其他用户的数据。</li>
                <li><strong>数据备份</strong>：本平台无法保证绝对安全，用户应自行做好数据库备份。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">八、数据删除权利</h2>
              <p className="mb-3">您可随时行使数据删除权利：</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>在「账号管理」页面删除账号，该账号的所有凭证、关联任务和执行日志将从数据库中永久删除。</li>
                <li>在「任务管理」页面删除任务，该任务的配置和执行日志将被清除。</li>
                <li>管理员可删除用户账号，该用户的全部数据（账号、任务、日志、设备信息、通知配置）将被级联删除。</li>
                <li>删除操作不可逆，删除后我们不会保留任何与您账号相关的信息。</li>
                <li>我们绝不会在您删除数据后继续持有或使用您的任何信息。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">九、我们的承诺</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>绝对不会将您的数据出售、出租或提供给任何第三方。</li>
                <li>绝对不会使用您的账号进行签到以外的任何游戏操作。</li>
                <li>绝对不会在未经授权的情况下读取或修改您的游戏资产。</li>
                <li>绝对不会向您的游戏账号发送任何非签到相关的请求。</li>
                <li>您的数据属于您，我们仅作为功能执行的中间方，不持有您的任何游戏资产权益。</li>
              </ol>
              <p className="mt-3 text-sm text-text-tertiary">
                💼 本平台为个人开发的非商业性质公益工具，旨在为玩家提供便利。平台按「现状」提供，不附带任何明示或暗示的保证。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">六、免责声明</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>服务可用性</strong>：本平台以「现状」提供服务，不保证服务的持续可用性和稳定性。因网络故障、服务器维护、第三方平台接口变更等原因导致的服务中断，本平台不承担责任。</li>
                <li><strong>签到结果</strong>：本平台不保证自动签到操作一定成功，签到结果取决于目标平台的接口状态和规则。</li>
                <li><strong>账号风险</strong>：使用自动签到功能可能违反目标平台的服务条款，用户应自行评估风险。因使用本平台导致的目标平台账号异常，本平台不承担责任。</li>
                <li><strong>开源免责</strong>：本平台以 MIT 协议开源，用户自行部署和使用，开发者不对使用过程中产生的任何损失承担责任。</li>
                <li><strong>不可抗力</strong>：因不可抗力（包括但不限于自然灾害、政策变化、战争等）导致的服务中断或数据丢失，本平台不承担责任。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">十、知识产权</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>本平台的源代码以 MIT 协议开源，用户可自由使用、修改和分发。</li>
                <li>本平台使用的第三方库和组件遵循其各自的开源协议。</li>
                <li>各游戏平台的名称、Logo、游戏内容等知识产权归其各自所有者所有。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">十一、协议变更</h2>
              <p>
                本平台保留随时修改本协议的权利。协议变更后，将在平台上公布更新后的版本。继续使用本平台即视为同意变更后的条款。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">十二、适用法律</h2>
              <p>
                本协议适用中华人民共和国法律。因本协议引起的任何争议，双方应友好协商解决；协商不成的，应提交至本平台运营方所在地有管辖权的人民法院解决。
              </p>
            </section>

            <p className="mt-8 pt-6 border-t border-border text-sm text-text-tertiary">
              使用本平台即表示您已阅读、理解并同意本协议的全部条款。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
