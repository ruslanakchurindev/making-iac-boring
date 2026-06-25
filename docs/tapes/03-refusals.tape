Output docs/assets/03-refusals.gif

Require node

Set Shell zsh
Set FontSize 18
Set Width 1200
Set Height 620
Set Padding 18
Set Margin 10
Set MarginFill "#111827"
Set WindowBar Colorful
Set BorderRadius 8
Set TypingSpeed 30 ms

Hide
Type "clear"
Enter
Show

Type "node demo/views.ts refusals:helpers"
Enter
Wait+Screen /provider calls never run/
Sleep 6 s

Hide
Type "clear"
Enter
Show

Type "node demo/views.ts refusals:topology"
Enter
Wait+Screen /refuses to guess/
Sleep 6 s

Hide
Type "clear"
Enter
Show

Type "node demo/views.ts refusals:bindings"
Enter
Wait+Screen /resolved value is not enough/
Sleep 6 s

Hide
Type "clear"
Enter
Show

Type "node demo/views.ts refusals:waves"
Enter
Wait+Screen /full error detail/
Sleep 9 s
