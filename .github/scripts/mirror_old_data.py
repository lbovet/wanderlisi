#!/usr/bin/env python3
"""Mirror a directory of the old Wanderlisi application.

The old site (https://www.windmaster.ch/wanderlisi/) exposed every data
directory as a JSON array through an ``index.php`` (the output of PHP's
``scandir()``). A plain recursive downloader cannot discover the files because
the listings are JSON, not HTML. This script reads those JSON listings and
downloads every entry, recreating the tree.

Entries are treated as directories when they have no dot in their name and as
files otherwise — that matches how the old application stored the tracks.
``index.php`` files are skipped: they only exist to publish the listing on the
old Apache/PHP server.

Usage:
    mirror_old_data.py <base-url> <destination-directory>
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

SKIP = {"index.php", ".", ".."}
USER_AGENT = "wanderlisi-seed/1.0"


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def download(base_url, path, dest):
    data = fetch(f"{base_url}/{urllib.parse.quote(path)}")
    target = os.path.join(dest, path)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "wb") as handle:
        handle.write(data)
    return len(data)


def mirror(base_url, dest):
    base_url = base_url.rstrip("/")
    stats = {"files": 0, "bytes": 0}

    def walk(path):
        # The old directory listings always end with a slash, but be tolerant.
        directory = f"{base_url}/{urllib.parse.quote(path)}/" if path else base_url + "/"
        for entry in json.loads(fetch(directory)):
            if entry in SKIP:
                continue
            child = f"{path}/{entry}" if path else entry
            if "." in entry:
                stats["bytes"] += download(base_url, child, dest)
                stats["files"] += 1
            else:
                walk(child)

    walk("")
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", help="e.g. https://host/wanderlisi/data/tracks")
    parser.add_argument("dest", help="local destination directory")
    args = parser.parse_args()

    os.makedirs(args.dest, exist_ok=True)
    stats = mirror(args.base_url, args.dest)
    print(f"Downloaded {stats['files']} files ({stats['bytes']} bytes) from {args.base_url}")


if __name__ == "__main__":
    sys.exit(main())
