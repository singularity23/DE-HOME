---
name: create-agent-skill
description: Create or update Cursor Agent Skills with valid frontmatter, clear triggers, and reusable workflow sections. Use when the user asks to create a skill, improve SKILL.md content, or scaffold a new slash skill.
argument-hint: [skill purpose, triggers, tools, and optional name]
---

# Create Agent Skill

## Quick Start

Use this skill to generate a production-ready `SKILL.md` for Cursor.

Examples:
- `/create-agent-skill Build a release checklist skill for frontend deploys`
- `/create-agent-skill Create a skill for SQL debugging in legacy pages`
- `/create-agent-skill Improve my existing SKILL.md to be auto-discoverable`

## Inputs To Collect

Capture these before writing:
1. Skill name (kebab-case, <= 64 chars)
2. What the skill does
3. When it should trigger (keywords/phrases)
4. Whether it has side effects
5. Optional tools/model/context constraints

If details are missing, infer reasonable defaults and list assumptions.

## Workflow

### 1) Classify the Request

- **Manual workflow with side effects** (deploy, commit, triage) -> set `disable-model-invocation: true`.
- **Background knowledge or reusable guidance** -> keep model invocation enabled.
- **Complex guidance** -> use a skill directory with optional reference files.

### 2) Draft Strong Frontmatter

Minimum:
- `name`
- `description` (must include both what it does and when to use it)

Optional when useful:
- `argument-hint`
- `disable-model-invocation`
- `allowed-tools`
- `context`
- `agent`
- `model`

### 3) Write SKILL.md Body

Use standard markdown headings:
- `# <Skill Title>`
- `## Quick Start`
- `## Instructions`
- `## Examples`

Keep instructions procedural and concrete. Prefer checklists or numbered steps for repeatability.

### 4) Add Validation Pass

Confirm:
- Frontmatter is valid YAML
- Description is specific and trigger-friendly
- File is concise and practical
- Side-effect skills are not auto-invocable by model

## Output Template

Return a complete `SKILL.md` in this structure:

```markdown
---
name: <skill-name>
description: <what it does>. Use when <trigger conditions>.
argument-hint: [optional args]
---

# <Skill Title>

## Quick Start
- /<skill-name> <example>

## Instructions
1. <step>
2. <step>
3. <step>

## Examples
- Input: <example prompt>
- Output: <expected behavior>
```

## Quality Bar

- Use clear operational verbs.
- Avoid vague phrasing like "help with tasks".
- Prefer practical defaults over many branches.
- Include at least 2 concrete examples.
