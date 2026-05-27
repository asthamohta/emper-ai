#!/usr/bin/env python3
import sys
import json
import tempfile
import os

try:
    from pydriller import RepositoryMining, GitRepository
except ImportError as e:
    print(json.dumps({"error": "missing pydriller: %s" % str(e)}))
    sys.exit(1)

def analyze(repo_full_name, username, max_commits=5):
    # repo_full_name: owner/repo
    clone_url = f"https://github.com/{repo_full_name}.git"
    tmpdir = tempfile.mkdtemp(prefix="pydriller_")
    try:
        gr = GitRepository.clone(clone_url, tmpdir)
    except Exception as e:
        # fallback: try without cloning (PyDriller can accept url but cloning is simpler)
        try:
            gr = GitRepository.clone(clone_url, tmpdir)
        except Exception as e2:
            print(json.dumps({"error": str(e2)}))
            return

    commits = []
    # Collect commit metrics
    for commit in RepositoryMining(tmpdir).traverse_commits():
        added = 0
        removed = 0
        files_changed = 0
        for mf in commit.modified_files:
            files_changed += 1
            added += mf.added
            removed += mf.removed
        commits.append({
            "sha": commit.hash,
            "author": commit.author.name,
            "author_email": commit.author.email,
            "msg": commit.msg,
            "date": commit.author_date.isoformat(),
            "added": added,
            "removed": removed,
            "files_changed": files_changed,
            "is_merge": commit.merge,
        })

    # Heuristics: pick merges by user, then largest diffs
    merges_by_user = [c for c in commits if c['is_merge'] and username.lower() in (c['author'] or '').lower()]
    # sort largest diffs
    sorted_by_diff = sorted(commits, key=lambda c: (c['added'] + c['removed']), reverse=True)

    selected = []
    seen = set()

    for c in merges_by_user:
        if c['sha'] not in seen:
            selected.append(c)
            seen.add(c['sha'])
        if len(selected) >= max_commits:
            break

    # Add top diffs
    for c in sorted_by_diff:
        if c['sha'] in seen:
            continue
        selected.append(c)
        seen.add(c['sha'])
        if len(selected) >= max_commits:
            break

    # Attempt to include a tag/release commit if present (use git tags)
    try:
        tags = gr.get_list_tags()
        if tags:
            # get commit for latest tag
            latest_tag = tags[-1]
            tag_sha = gr.get_tag_sha(latest_tag)
            if tag_sha and tag_sha not in seen:
                # find commit
                for c in commits:
                    if c['sha'] == tag_sha:
                        selected.append(c)
                        break
    except Exception:
        pass

    # Trim diffs/snippets for each selected commit
    out = []
    for c in selected[:max_commits]:
        # try to get a short diff snippet
        diff_snippet = ""
        try:
            patch = gr.get_commit(c['sha']).diff
            if patch:
                diff_snippet = patch[:1000]
        except Exception:
            diff_snippet = ""
        out.append({
            "sha": c['sha'],
            "author": c['author'],
            "msg": c['msg'],
            "date": c['date'],
            "added": c['added'],
            "removed": c['removed'],
            "files_changed": c['files_changed'],
            "is_merge": c['is_merge'],
            "diff_snippet": diff_snippet,
        })

    print(json.dumps(out))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: pydriller_analyze.py owner/repo username"}))
        sys.exit(1)
    owner_repo = sys.argv[1]
    user = sys.argv[2]
    analyze(owner_repo, user)
