FROM php:8.2-apache

# Instalar solo lo esencial y en una sola capa
RUN docker-php-ext-install mysqli pdo pdo_mysql && \
    a2enmod rewrite && \
    chown -R www-data:www-data /var/www/html

COPY . /var/www/html/
