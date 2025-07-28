# 使用官方 Python 作為基礎映像
FROM python:3.9

# 設置工作目錄
WORKDIR /app

# 複製專案檔案到容器
COPY . /app

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 設定環境變數，防止 Python 緩存 .pyc 檔
ENV PYTHONUNBUFFERED=1

# 執行遷移並啟動 Gunicorn 伺服器，使用 PORT 環境變數
CMD ["sh", "-c", "python3 manage.py migrate && python3 manage.py collectstatic --noinput && exec gunicorn selleryltd.wsgi:application --bind 0.0.0.0:$PORT" ]
