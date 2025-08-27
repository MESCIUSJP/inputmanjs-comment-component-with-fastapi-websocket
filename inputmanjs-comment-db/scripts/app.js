document.addEventListener('DOMContentLoaded', () => {

    const baseURL = `http://localhost:8000/`;
    const commentURL = `${baseURL}comments`;
    const userURL = `${baseURL}users`;
    const reactionURL = `${baseURL}reactions`;

    // ログイン状態管理
    let currentUser = null;
    // コメントコンポーネント
    let gcComment = null;

    let socket = io(baseURL, { transports: ["websocket", "polling"] });

    // ページロード時にlocalStorageから自動ログイン
    let savedUser = localStorage.getItem('gcCommentUser');
    if (savedUser) {
        try {
            const userInfo = JSON.parse(savedUser);
            currentUser = userInfo;
            document.getElementById('login-area').style.display = 'none';
            document.getElementById('gcComment').style.display = '';
            if (socket.connected === false) {
                socket.connect();
            }
            socket.on('connect', () => {
                initGcComment(currentUser);
            });
        } catch (e) {
            localStorage.removeItem('gcCommentUser');
        }
    }

    // ログインボタン処理
    document.getElementById('login-btn').addEventListener('click', async () => {
        const userId = document.getElementById('userid-input').value.trim();
        if (!userId) {
            alert('ユーザーIDを入力してください');
            return;
        }
        // バックエンドからユーザー情報取得
        try {
            const res = await fetch(`http://localhost:8000/users?id=${encodeURIComponent(userId)}`);
            if (!res.ok) throw new Error('ユーザー取得失敗');
            const user = await res.json();
            if (user.length === 0) {
                alert('ユーザーが見つかりません');
                return;
            }
            currentUser = {
                id: String(user[0].id),
                username: user[0].username,
                avatar: user[0].avatar,
                avatarType: 'square',
            };
            // localStorageに保存
            localStorage.setItem('gcCommentUser', JSON.stringify(currentUser));
            document.getElementById('login-area').style.display = 'none';
            document.getElementById('gcComment').style.display = '';

            socket.connect();
            socket.on('connect', () => {
                if (Object.keys(gcComment).length === 0) {
                    initGcComment(currentUser);
                }
            });
            window.location.hash = '#chat';
        } catch (e) {
            console.log('Error fetching user information:', e);
            alert('ユーザー情報の取得に失敗しました');
        }
    });

    // コメントコンポーネント初期化関数
    function initGcComment(userInfo) {
        gcComment = new GC.InputMan.GcComment(document.getElementById('gcComment'), {
            dataSource: {
                enabled: true,
                remote: {
                    comments: {
                        read: { url: commentURL },
                        create: { url: commentURL, requestData: { socketId: socket.id } },
                        update: { url: commentURL, requestData: { socketId: socket.id } },
                        delete: { url: commentURL, requestData: { socketId: socket.id } }
                    },
                    users: {
                        read: {
                            url: userURL,
                            schema: {
                                dataSchema: {
                                    name: 'username'
                                }
                            }
                        }
                    },
                    reactions: {
                        read: { url: reactionURL },
                        create: { url: reactionURL, requestData: { socketId: socket.id } },
                        delete: { url: reactionURL, requestData: { socketId: socket.id } }
                    },
                }
            },
            editorConfig: { height: 150 },
            commentMode: GC.InputMan.GcCommentMode.ThreadMode,
            userInfo: userInfo,
            header: [
                'userinfo'
            ],
            headerFooterItems: {
                userinfo: (gcComment) => {
                    let container = document.createElement('div'); // 新しいコンテナ要素を作成
                    let label = document.createElement('span'); // テキスト用のspan要素を作成
                    label.innerText = 'ユーザー名：' + gcComment.userInfo.username; // ラベルのテキストを設定
                    label.style.marginRight = '10px'; // ボタンとの間に少し余白を追加

                    let btn = document.createElement('button');
                    btn.innerText = 'ログアウト';
                    btn.classList.add('btn');
                    btn.addEventListener('click', () => {
                        if (window.confirm('ログアウトしますか？')) {
                            localStorage.removeItem('gcCommentUser');
                            gcComment.destroy();
                            savedUser = null;
                            currentUser = null;
                            socket.disconnect();
                            document.getElementById('login-area').style.display = '';
                            document.getElementById('gcComment').style.display = 'none';
                            window.location.hash = '';
                        }

                    });

                    container.appendChild(label); // ラベルをコンテナに追加
                    container.appendChild(btn); // ボタンをコンテナに追加

                    return {
                        getElement: () => container,
                    };
                },
            },
        });
    }

    // サーバー側で定義されているcommentupdatedイベントの発火を検知します。
    socket.on('commentupdated', (msg) => {
        handleCommentsChange(msg);
    });

    //  サーバー側で定義されているreactionupdatedイベントの発火を検知します。
    socket.on('reactionupdated', (msg) => {
        handleReactionChange(msg);
    });

    function handleCommentsChange(msg) {
        switch (msg.type) {
            case 'add':
                gcComment.execCommand(GC.InputMan.GcCommentCommand.AddCommentElement, {
                    comment: {
                        ...msg.comment,
                        parentCommentId: String(msg.comment.parentCommentId) || null,
                        postTime: new Date(msg.comment.postTime),
                        updateTime: new Date(msg.comment.updateTime),
                    },
                    scrollIntoView: true
                });
                break;

            case 'delete':
                gcComment.execCommand(GC.InputMan.GcCommentCommand.DeleteCommentElement, {
                    commentId: String(msg.id)
                });
                break;

            case 'update':
                const comment = getComment(gcComment.comments, msg.comment.id);
                if (!comment) {
                    console.warn('更新対象のコメントが見つかりません:', msg.comment.id);
                    return;
                }
                if (comment) {
                    gcComment.execCommand(GC.InputMan.GcCommentCommand.UpdateCommentElement, {
                        comment: {
                            ...comment,
                            content: msg.comment.content,
                            updateTime: new Date(msg.comment.updateTime)
                        }
                    });
                }
                break;
            default:
                return;
        }
    }

    function handleReactionChange(msg) {
        const comment = getComment(gcComment.comments, msg.commentId);
        const reaction = getReactionInfo(msg.commentId, currentUser.id, msg.reactionInfo);
        if (comment) {
            gcComment.execCommand(GC.InputMan.GcCommentCommand.UpdateCommentElement, {
                comment: {
                    ...comment,
                    reactions: reaction
                },
            });
        }
    }

    function getComment(comments, commentId) {
        for (const comment of comments) {
            if (comment.id == commentId) {
                return comment;
            }
            if (Array.isArray(comment.replies)) {
                const res = getComment(comment.replies, commentId);
                if (res) return res;
            }
        }
        return null;
    }

    function getReactionInfo(commentId, currentUserId, reactions) {
        const reactionMap = new Map();

        reactions.forEach((reaction) => {

            if (!reactionMap.has(reaction.reactionChar)) {
                reactionMap.set(reaction.reactionChar, {
                    reactionChar: reaction.reactionChar,
                    count: 0,
                    currentUserReacted: false,
                });
            }
            const reactionInfo = reactionMap.get(reaction.reactionChar);
            reactionInfo.count++;
            if (reaction.userId == currentUserId) {
                reactionInfo.currentUserReacted = true;
            }
        });
        return Array.from(reactionMap.values());
    }

});
