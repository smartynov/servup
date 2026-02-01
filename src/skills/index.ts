import yaml from 'js-yaml'
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

function parseSkill(raw: string): Skill {
  const data = yaml.load(raw) as Record<string, unknown>
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) || '',
    category: (data.category as string) || 'other',
    os: (data.os as ('debian' | 'redhat')[]) || ['debian'],
    priority: (data.priority as number) || 50,
    repeatable: (data.repeatable as boolean) || false,
    builtin: true,
    params: ((data.params as Array<Record<string, unknown>>) || []).map((p) => ({
      id: p.id as string,
      label: p.label as string,
      type: (p.type as 'string' | 'number' | 'boolean' | 'select' | 'textarea') || 'string',
      default: String(p.default ?? ''),
      required: p.required !== false,
      options: p.options as string[] | undefined,
      github_import: p.github_import as boolean | undefined,
    })),
    scripts: data.scripts as { debian?: string; redhat?: string },
  }
}

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

export const builtinSkills: Skill[] = builtinYamls.map(parseSkill)

export { parseSkill }
