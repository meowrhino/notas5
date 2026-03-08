# 🧭 Guia ràpida per a un nou usuari de GitHub (workflow suau)

 <span style="font-family: .AppleColorEmojiUI;">
     🧭
 </span> Guia ràpida per a un nou usuari de GitHub (workflow suau)

Això és el que li pots passar a qualsevol persona perquè tingui una experiència fluida des del principi:

 <span style="font-family: .AppleColorEmojiUI;">
     1️⃣
 </span> Configuració inicial a l’ordinador
git config --global user.name "El teu nom"
git config --global user.email "el_teu_email@exemple.com"

 <span style="font-family: .AppleColorEmojiUI;">
     2️⃣
 </span> Generar i afegir clau SSH (només un cop per ordinador)
ssh-keygen -t ed25519 -C "el_teu_email@exemple.com"
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
pbcopy < ~/.ssh/id_ed25519.pub


 <span style="font-family: ZapfDingbatsITC;">
     ➡
 </span> Ves a https://github.com/settings/keys
 → New SSH key → enganxa → “Add SSH key”.

Prova:

ssh -T git@github.com

 <span style="font-family: .AppleColorEmojiUI;">
     3️⃣
 </span> Clonar o crear repositori amb SSH

Quan creïs o clonis repos, tria l’opció SSH a GitHub (no HTTPS):

git clone git@github.com:usuari/nom-del-repo.git

 <span style="font-family: .AppleColorEmojiUI;">
     4️⃣
 </span> Treballar i pujar canvis

Cada cop que facis canvis:

git add .
git commit -m "Explica què has canviat"
git pull --rebase origin main
git push origin main


(Si no tens canvis conflictius, això és copy-paste i ja.)