#!/bin/zsh

root=$(pwd)

######Clone Repositories
git clone git@github.com:HooliganhordeGangs/Hooliganhorde.git
git clone git@github.com:HooliganhordeGangs/Hooliganhorde-SDK.git
git clone git@github.com:HooliganhordeGangs/Hooliganhorde-UI.git
git clone git@github.com:HooliganhordeGangs/Hooliganhorde-Subgraph.git
git clone git@github.com:HooliganhordeFarms/Hooligan-Subgraph.git

##### Hooliganhorde
cd $root/Hooliganhorde
git checkout -b monorepo
cd $root

###### SDK
# This folder gets root-leve merged with /Hooliganhorde
cd $root/Hooliganhorde-SDK
rm -rf .git
rm -rf .husky
mv docs projects/sdk
echo >> $root/Hooliganhorde/.gitignore
echo >> $root/Hooliganhorde/.gitignore
echo "# From SDK Monorepo Join:" >> $root/Hooliganhorde/.gitignore
cat .gitignore >> $root/Hooliganhorde/.gitignore
rm .gitignore
rm README.md
cp -r . $root/Hooliganhorde

cd $root/Hooliganhorde
git add .
git commit -m "monorepo: merge with sdk"

###### UI
cd $root/Hooliganhorde-UI
rm -rf .git
rm -rf .yarn
rm .yarnrc.yml 
mkdir $root/Hooliganhorde/projects/ui
cp -r . $root/Hooliganhorde/projects/ui

cd $root/Hooliganhorde
git add .
git commit -m "monorepo: add ui"

###### Hooliganhorde-Subgraph
cd $root/Hooliganhorde-Subgraph
rm -rf .git
rm package-lock.json
mkdir $root/Hooliganhorde/projects/subgraph-hooliganhorde
cp -r . $root/Hooliganhorde/projects/subgraph-hooliganhorde
cd $root/Hooliganhorde
git add .
git commit -m "monorepo: add subgraph-hooliganhorde"

##### Hooligan-Subgraph
cd $root/Hooligan-Subgraph
rm -rf .git
rm package-lock.json
mkdir $root/Hooliganhorde/projects/subgraph-hooligan
cp -r . $root/Hooliganhorde/projects/subgraph-hooligan
cd $root/Hooliganhorde
git add .
git commit -m "monorepo: add subgraph-hooligan"

##### Post Ops
cd $root
# rm -rf Hooliganhorde-SDK
# rm -rf Hooliganhorde-UI
# rm -rf Hooliganhorde-Subgraph
# rm -rf Hooligan-Subgraph

# update package.json files as needed
node ./mono.js
cd $root/Hooliganhorde
git add .
git commit -m "monorepo: update projects' package.json"

# Make yarn work
rm $root/Hooliganhorde/protocol/yarn.lock
rm $root/Hooliganhorde/projects/subgraph-hooliganhorde/yarn.lock
rm $root/Hooliganhorde/projects/subgraph-hooligan/yarn.lock
rm $root/Hooliganhorde/projects/ui/yarn.lock
yarn && git add . && git commit -m "monorepo: update yarn"
 
# Add monorepo scripts for historic/audit purposes
mkdir -p $root/Hooliganhorde/utils/monorepo-creation
cp $root/go.sh $root/Hooliganhorde/utils/monorepo-creation
cp $root/reset.sh $root/Hooliganhorde/utils/monorepo-creation
cp $root/mono.js $root/Hooliganhorde/utils/monorepo-creation
git add . && git commit -m "monorepo: add utils"



