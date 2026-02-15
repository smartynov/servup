import { parseSkillYaml } from '@/core/skills-parser'
import type { Skill } from '@/types'

import setHostnameYaml from './set-hostname.yaml?raw'
import setTimezoneYaml from './set-timezone.yaml?raw'
import configureSudoersYaml from './configure-sudoers.yaml?raw'
import disableSshPasswordYaml from './disable-ssh-password.yaml?raw'
import configureFirewallYaml from './configure-firewall.yaml?raw'
import installFail2banYaml from './install-fail2ban.yaml?raw'
import installDockerYaml from './install-docker.yaml?raw'
import installNginxYaml from './install-nginx.yaml?raw'
import installNodeYaml from './install-node.yaml?raw'
import createUserYaml from './create-user.yaml?raw'
import configureInputrcYaml from './configure-inputrc.yaml?raw'
import installVimYaml from './install-vim.yaml?raw'
import installHtopYaml from './install-htop.yaml?raw'
import installNetToolsYaml from './install-net-tools.yaml?raw'

const builtinYamls = [
  setHostnameYaml,
  setTimezoneYaml,
  configureSudoersYaml,
  disableSshPasswordYaml,
  configureFirewallYaml,
  installFail2banYaml,
  installDockerYaml,
  installNginxYaml,
  installNodeYaml,
  createUserYaml,
  configureInputrcYaml,
  installVimYaml,
  installHtopYaml,
  installNetToolsYaml,
]

export const builtinSkills: Skill[] = builtinYamls.map((raw) => ({
  ...parseSkillYaml(raw),
  builtin: true,
}))
