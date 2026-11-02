import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface CommitItem {
  commit_number: number;
  date: string;
  message: string;
  description: string;
  files: string[];
}

function run(cmd: string, env: Record<string, string> = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function runCapture(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function main() {
  const planPath = path.join(process.cwd(), 'commits_plan.json');
  if (!fs.existsSync(planPath)) {
    console.error('commits_plan.json not found!');
    process.exit(1);
  }

  const commits: CommitItem[] = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  console.log(`Loaded ${commits.length} commits from commits_plan.json.`);

  const authorName = 'Shwetang Yadav';
  const authorEmail = 'yaduvanshishwetang@gmail.com';

  // 1. Backup current main branch just in case
  try {
    run('git branch -f backup-main main');
    console.log('Created backup-main branch.');
  } catch (e) {
    console.warn('Notice: could not backup main branch:', e);
  }

  // 2. Create orphan branch clean-main
  const targetBranch = 'clean-main';
  try {
    execSync(`git branch -D ${targetBranch}`, { stdio: 'ignore' });
  } catch {}

  console.log(`\nCreating clean orphan branch '${targetBranch}'...`);
  run(`git checkout --orphan ${targetBranch}`);
  run('git reset'); // unstage everything

  // 3. Base files included in first commit to ensure a fully runnable application
  const baseFiles = [
    'next-env.d.ts',
    'src/app/layout.tsx',
    'src/components/ApiKeyModal.tsx',
    'src/components/ConceptsChecklist.tsx',
    'src/components/Header.tsx',
    'src/components/InputSection.tsx',
    'src/components/QuizEngine.tsx',
    'src/components/RefinementInput.tsx',
    'src/components/SavedSessionsModal.tsx',
    'src/hooks/useAIGenerator.ts',
    'src/lib/aiProvider.ts',
    'src/lib/schemaValidator.ts',
    'src/lib/soundEffects.ts',
    'public',
  ];

  // 4. Iterate through each commit in the plan
  for (const c of commits) {
    console.log(`\n========================================`);
    console.log(`Processing Commit #${c.commit_number}: ${c.message}`);
    console.log(`Date: ${c.date}`);
    console.log(`========================================`);

    // Stage files
    if (c.commit_number === 1) {
      for (const f of [...c.files, ...baseFiles]) {
        if (fs.existsSync(f)) {
          run(`git add "${f}"`);
        }
      }
    } else if (c.commit_number === 15) {
      // Final commit stages all remaining files in repository
      run('git add -A');
      // Unstage helper script and plan so repo stays clean
      try {
        run('git reset commits_plan.json');
      } catch {}
    } else {
      for (const f of c.files) {
        if (fs.existsSync(f)) {
          run(`git add "${f}"`);
        }
      }
    }

    const env = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail,
      GIT_AUTHOR_DATE: c.date,
      GIT_COMMITTER_DATE: c.date,
    };

    // Check if anything is staged
    const staged = runCapture('git status --porcelain');
    const escapedMessage = c.message.replace(/"/g, '\\"');

    if (staged.length > 0) {
      run(`git commit -m "${escapedMessage}"`, env);
    } else {
      console.log(`Notice: No changes staged for commit #${c.commit_number}, creating allow-empty commit.`);
      run(`git commit --allow-empty -m "${escapedMessage}"`, env);
    }
  }

  console.log('\n========================================');
  console.log('Successfully created all 15 commits!');
  console.log('========================================');

  // 5. Replace main branch with the clean 15-commit tree
  run('git branch -M main');

  // Display the 15 commits
  run('git log --pretty=format:"%h - %ad - %s" -n 15');

  // 6. Point origin to https://github.com/shwetang01/StudyCraft_AI.git
  const targetRemoteUrl = 'https://github.com/shwetang01/StudyCraft_AI.git';
  try {
    run(`git remote set-url origin ${targetRemoteUrl}`);
  } catch {
    run(`git remote add origin ${targetRemoteUrl}`);
  }

  // Also preserve legacy remote
  try {
    run('git remote add legacy https://github.com/shwetang01/StudyCraft.git');
  } catch {}

  console.log(`\n========================================`);
  console.log(`Pushing 15 commits to ${targetRemoteUrl}...`);
  console.log(`========================================`);
  run('git push -u origin main --force');

  console.log('\n✅ Push to https://github.com/shwetang01/StudyCraft_AI completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
